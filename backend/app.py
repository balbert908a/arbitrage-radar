import os, json, re, base64, statistics
from typing import Any
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI(title="Arbitrage Radar Intelligence API", version="3.0")

origins=[x.strip() for x in os.getenv("ALLOWED_ORIGINS","*").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins!=["*"] else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_MODEL=os.getenv("OPENAI_MODEL","gpt-5.6-luna")
client=OpenAI() if os.getenv("OPENAI_API_KEY") else None

class BarcodeRequest(BaseModel):
    code: str

class PhotoRequest(BaseModel):
    image_data_url: str

def parse_json_text(text:str)->dict:
    text=text.strip()
    text=re.sub(r"^```(?:json)?\s*","",text)
    text=re.sub(r"\s*```$","",text)
    try:
        return json.loads(text)
    except Exception:
        m=re.search(r"\{.*\}",text,re.S)
        if not m: raise ValueError("AI returned non-JSON output")
        return json.loads(m.group(0))

async def upcitemdb_lookup(code:str)->dict|None:
    # UPCitemdb trial endpoint: no key, documented free limit.
    if not re.fullmatch(r"\d{8,14}",code): return None
    url="https://api.upcitemdb.com/prod/trial/lookup"
    try:
        async with httpx.AsyncClient(timeout=10) as h:
            r=await h.get(url,params={"upc":code},headers={"Accept":"application/json"})
        if r.status_code!=200: return None
        data=r.json()
        items=data.get("items") or []
        if not items: return None
        x=items[0]
        return {
            "title":x.get("title"),
            "brand":x.get("brand"),
            "model":x.get("model"),
            "upc":x.get("upc") or code,
            "ean":x.get("ean"),
            "category":x.get("category"),
            "description":x.get("description"),
            "confidence":"database match"
        }
    except Exception:
        return None

def ai_research_product(prompt:str, image_data_url:str|None=None)->dict:
    if not client:
        raise HTTPException(503,"OPENAI_API_KEY is not configured on the backend.")
    content=[{"type":"input_text","text":prompt}]
    if image_data_url:
        content.append({"type":"input_image","image_url":image_data_url,"detail":"high"})
    resp=client.responses.create(
        model=OPENAI_MODEL,
        tools=[{"type":"web_search"}],
        input=[{"role":"user","content":content}],
    )
    return parse_json_text(resp.output_text)

def barcode_prompt(code:str, known:dict|None)->str:
    known_text=json.dumps(known) if known else "null"
    return f"""
You are the product-identification and resale-research engine for a retail-arbitrage app.
Identifier scanned: {code}
Known barcode database result: {known_text}

Identify the exact product if possible. Use web search. Then research REAL RESALE EVIDENCE.
Do not use MSRP, compare-at price, or original retail price as resale evidence.
Prefer completed/sold marketplace evidence. Active listings may be included only as secondary evidence.
If you cannot verify sold/completed evidence, resale.status MUST be "INSUFFICIENT_SOLD_EVIDENCE" and typical_sold must be null.
Never invent prices, sales, inventory, UPCs, ASINs, or model numbers.

Return ONLY valid JSON:
{{
 "product": {{
   "title": string|null, "brand": string|null, "model": string|null,
   "upc": string|null, "ean": string|null, "asin": string|null,
   "category": string|null, "confidence": "high"|"medium"|"low"
 }},
 "resale": {{
   "status": "SOLD_EVIDENCE_FOUND"|"INSUFFICIENT_SOLD_EVIDENCE",
   "sold_prices": [number],
   "typical_sold": number|null,
   "active_prices": [number],
   "note": string,
   "sources": [{{"url":string,"label":string}}]
 }}
}}
"""

def photo_prompt()->str:
    return """
You are the product-identification and resale-research engine for a retail-arbitrage app.
Analyze the attached product photo. Read visible brand, model, size, packaging text and distinguishing details.
Identify the exact product or the narrowest defensible match. Use web search to corroborate the identification and research REAL RESALE EVIDENCE.
Do not use MSRP, compare-at price, or original retail price as resale evidence.
Prefer completed/sold marketplace evidence. Active listings are secondary.
If exact product identity is uncertain, say so with low/medium confidence.
If you cannot verify sold/completed evidence, resale.status MUST be "INSUFFICIENT_SOLD_EVIDENCE" and typical_sold must be null.
Never invent prices, sales, inventory, identifiers, or model numbers.

Return ONLY valid JSON:
{
 "product": {
   "title": string|null, "brand": string|null, "model": string|null,
   "upc": string|null, "ean": string|null, "asin": string|null,
   "category": string|null, "confidence": "high"|"medium"|"low"
 },
 "resale": {
   "status": "SOLD_EVIDENCE_FOUND"|"INSUFFICIENT_SOLD_EVIDENCE",
   "sold_prices": [number],
   "typical_sold": number|null,
   "active_prices": [number],
   "note": string,
   "sources": [{"url":string,"label":string}]
 }
}
"""

@app.get("/api/health")
def health():
    return {"status":"ok","openai_configured":bool(client),"model":OPENAI_MODEL}

@app.post("/api/identify/barcode")
async def identify_barcode(req:BarcodeRequest):
    code=req.code.strip()
    if not code: raise HTTPException(400,"Missing barcode.")
    known=await upcitemdb_lookup(code)
    data=ai_research_product(barcode_prompt(code,known))
    # Preserve a real DB match if AI omitted fields.
    if known:
        p=data.setdefault("product",{})
        for k,v in known.items():
            if v and not p.get(k): p[k]=v
    return data

@app.post("/api/identify/photo")
def identify_photo(req:PhotoRequest):
    if not req.image_data_url.startswith("data:image/"):
        raise HTTPException(400,"Expected a base64 image data URL.")
    if len(req.image_data_url)>8_000_000:
        raise HTTPException(413,"Image too large.")
    return ai_research_product(photo_prompt(),req.image_data_url)
