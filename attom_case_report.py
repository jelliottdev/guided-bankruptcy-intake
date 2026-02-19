#!/usr/bin/env python3
"""
ATTOM Chapter 7 Property Snapshot (One-Screen, Trust-Oriented)

- Prompts for API key (hidden)
- Prompts for a full address
- Resolves ATTOM ID
- Pulls: owner, mortgage, AVM, assessment, sale history (best available)
- Prints a clean, one-screen report suitable for a screenshot
- Saves raw JSON responses for audit/trustee support

Termux notes:
  pkg install python -y
  pip install requests
"""

import json
import sys
import getpass
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    print("Missing dependency: requests")
    print("Fix in Termux:")
    print("  pip install requests")
    sys.exit(1)

BASE = "https://api.gateway.attomdata.com/propertyapi/v1.0.0"


# ---------------------------
# Helpers
# ---------------------------

def utc_now_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

def money(x):
    if x is None or x == "":
        return "N/A"
    try:
        return f"${int(round(float(x))):,}"
    except Exception:
        return "N/A"

def safe_get(d, path, default=None):
    """
    Safe nested getter.
    path: list of keys/indices, e.g. ["property", 0, "owner", "owner1", "fullname"]
    """
    cur = d
    try:
        for p in path:
            if isinstance(p, int):
                cur = cur[p]
            else:
                cur = cur.get(p)
        return default if cur is None else cur
    except Exception:
        return default

def save_json(filename, data):
    with open(filename, "w") as f:
        json.dump(data, f, indent=2)

def call_attom(apikey, endpoint, params=None):
    url = f"{BASE}{endpoint}"
    headers = {"Accept": "application/json", "APIKey": apikey}
    r = requests.get(url, headers=headers, params=params, timeout=30)
    try:
        j = r.json()
    except Exception:
        j = {"_raw": r.text}
    return r.status_code, j

def status_ok(j):
    # ATTOM returns status.code = 0 for success
    return safe_get(j, ["status", "code"], None) == 0

def short_status_line(name, http_code, j):
    code = safe_get(j, ["status", "code"], None)
    msg = safe_get(j, ["status", "msg"], None)
    return f"{name}: HTTP {http_code}, status.code={code}, msg={msg}"


# ---------------------------
# Extraction (EXACT PATHS)
# ---------------------------

def extract_owner(owner_json):
    # attom_owner.json structure you pasted:
    # property[0].owner.owner1.fullname etc.
    p = safe_get(owner_json, ["property", 0], {})
    addr = safe_get(p, ["address", "oneLine"], "N/A")

    o = safe_get(p, ["owner"], {}) or {}
    corp = safe_get(o, ["corporateindicator"], None)
    absentee = safe_get(o, ["absenteeownerstatus"], None)

    owner1 = safe_get(o, ["owner1", "fullname"], None)
    owner2 = safe_get(o, ["owner2", "fullname"], None)
    mailing = safe_get(o, ["mailingaddressoneline"], None)

    owners = [x for x in [owner1, owner2] if x]
    owners_str = " & ".join(owners) if owners else "N/A"

    return {
        "address_one_line": addr,
        "owners": owners_str,
        "corporateindicator": corp,
        "absenteeownerstatus": absentee,
        "mailing": mailing
    }

def extract_profile(detail_json):
    p = safe_get(detail_json, ["property", 0], {})
    summary = safe_get(p, ["summary"], {}) or {}
    building = safe_get(p, ["building"], {}) or {}
    size = safe_get(building, ["size"], {}) or {}
    rooms = safe_get(building, ["rooms"], {}) or {}
    lot = safe_get(p, ["lot"], {}) or {}

    prop_type = safe_get(summary, ["propertyType"], None) or safe_get(summary, ["propclass"], None)
    year = safe_get(summary, ["yearbuilt"], None)
    beds = safe_get(rooms, ["beds"], None)
    baths = safe_get(rooms, ["bathstotal"], None)
    sqft = safe_get(size, ["livingsize"], None) or safe_get(size, ["bldgsize"], None)

    acres = safe_get(lot, ["lotsize1"], None)
    lotsqft = safe_get(lot, ["lotsize2"], None)
    pool = safe_get(lot, ["pooltype"], None)

    return {
        "property_type": prop_type,
        "year_built": year,
        "beds": beds,
        "baths": baths,
        "living_sqft": sqft,
        "lot_acres": acres,
        "lot_sqft": lotsqft,
        "pool": pool,
    }

def extract_mortgage(mort_json):
    # You pasted:
    # property[0].mortgage.amount, date, loantypecode, interestratetype, lender.lastname, etc.
    p = safe_get(mort_json, ["property", 0], {})
    m = safe_get(p, ["mortgage"], {}) or {}

    mort_amt = safe_get(m, ["amount"], None)
    mort_date = safe_get(m, ["date"], None)
    loan_type = safe_get(m, ["loantypecode"], None)
    rate_type = safe_get(m, ["interestratetype"], None)

    lender = safe_get(m, ["lender"], {}) or {}
    lender_name = safe_get(lender, ["lastname"], None)
    lender_city = safe_get(lender, ["city"], None)
    lender_state = safe_get(lender, ["state"], None)

    title = safe_get(m, ["title"], {}) or {}
    title_company = safe_get(title, ["companyname"], None)

    return {
        "mortgage_amount": mort_amt,
        "mortgage_date": mort_date,
        "loan_type": loan_type,
        "rate_type": rate_type,
        "lender_name": lender_name,
        "lender_city": lender_city,
        "lender_state": lender_state,
        "title_company": title_company
    }

def extract_avm(avm_json):
    # You pasted:
    # property[0].avm.eventDate
    # property[0].avm.amount.value/low/high/scr/fsd
    p = safe_get(avm_json, ["property", 0], {})
    avm = safe_get(p, ["avm"], {}) or {}
    amt = safe_get(avm, ["amount"], {}) or {}

    return {
        "avm_date": safe_get(avm, ["eventDate"], None),
        "value": safe_get(amt, ["value"], None),
        "low": safe_get(amt, ["low"], None),
        "high": safe_get(amt, ["high"], None),
        "scr": safe_get(amt, ["scr"], None),
        "fsd": safe_get(amt, ["fsd"], None),
    }

def extract_assessment(assess_json):
    # We’ll try to read common fields if present; if missing, show N/A.
    p = safe_get(assess_json, ["property", 0], {})
    a = safe_get(p, ["assessment"], {}) or {}

    # Many ATTOM assessment payloads vary; we capture what exists.
    assessed = safe_get(a, ["assessed", "assdTtlValue"], None) or safe_get(a, ["assessedValue"], None)
    taxamt = safe_get(a, ["tax", "taxamt"], None) or safe_get(a, ["taxAmount"], None)
    taxyear = safe_get(a, ["tax", "taxyear"], None) or safe_get(a, ["taxYear"], None)

    # If your attom_assess.json is the one you already used (showed tax block),
    # the path may be property[0].assessment.tax.taxamt etc. This covers it.

    return {
        "assessed_value": assessed,
        "tax_amount": taxamt,
        "tax_year": taxyear
    }

def extract_sale(sales_json):
    # Sales history varies a lot. We'll look for a “sale” record with date/amount.
    p = safe_get(sales_json, ["property", 0], {})
    sale = safe_get(p, ["sale"], {}) or {}
    # fallback: some endpoints use "saleshistory" arrays, but we’ll keep safe
    sale_price = safe_get(sale, ["amount", "saleamt"], None) or safe_get(sale, ["saleamt"], None)
    sale_date = safe_get(sale, ["saleTransDate"], None) or safe_get(sale, ["salesearchdate"], None) or safe_get(sale, ["date"], None)

    return {
        "sale_price": sale_price,
        "sale_date": sale_date
    }


# ---------------------------
# Main
# ---------------------------

def main():
    print("ATTOM Property Snapshot (Chapter 7 / Trustee-Oriented, One-Screen)")
    print("")

    apikey = getpass.getpass("Enter ATTOM APIKey (input hidden): ").strip()
    if not apikey:
        print("No API key entered.")
        sys.exit(1)

    address = input("Enter full property address: ").strip()
    if not address:
        print("No address entered.")
        sys.exit(1)

    # 1) Resolve ATTOM ID
    http_id, j_id = call_attom(apikey, "/property/id", params={"address": address})
    save_json("attom_property_id.json", j_id)

    if http_id != 200 or not status_ok(j_id):
        print("")
        print("ERROR: Could not resolve property ID.")
        print(short_status_line("ID", http_id, j_id))
        print("Saved: attom_property_id.json")
        sys.exit(1)

    attom_id = safe_get(j_id, ["property", 0, "identifier", "attomId"], None)
    if not attom_id:
        print("")
        print("ERROR: No attomId found in response.")
        print("Saved: attom_property_id.json")
        sys.exit(1)

    # 2) Pull endpoints by ID
    pulls = {}

    # owner (detailowner)
    pulls["owner"] = call_attom(apikey, "/property/detailowner", params={"id": attom_id})
    save_json("attom_owner.json", pulls["owner"][1])

    # detail (basic profile)
    pulls["detail"] = call_attom(apikey, "/property/detail", params={"id": attom_id})
    save_json("attom_detail.json", pulls["detail"][1])

    # mortgage + owner
    pulls["mort_owner"] = call_attom(apikey, "/property/detailmortgageowner", params={"id": attom_id})
    save_json("attom_mort_owner.json", pulls["mort_owner"][1])

    # avm
    pulls["avm"] = call_attom(apikey, "/attomavm/detail", params={"id": attom_id})
    save_json("attom_avm.json", pulls["avm"][1])

    # assessment
    pulls["assess"] = call_attom(apikey, "/assessment/detail", params={"id": attom_id})
    save_json("attom_assess.json", pulls["assess"][1])

    # sales (best-effort)
    pulls["sales"] = call_attom(apikey, "/sale/detail", params={"id": attom_id})
    save_json("attom_sales.json", pulls["sales"][1])

    # 3) Extract
    owner_info = extract_owner(pulls["owner"][1])
    profile = extract_profile(pulls["detail"][1])
    mort = extract_mortgage(pulls["mort_owner"][1])
    avm = extract_avm(pulls["avm"][1])
    assess = extract_assessment(pulls["assess"][1])
    sale = extract_sale(pulls["sales"][1])

    # 4) Compute equity (only if both present)
    value = avm["value"]
    low = avm["low"]
    high = avm["high"]
    mort_amt = mort["mortgage_amount"]

    equity = (value - mort_amt) if (value is not None and mort_amt is not None) else None
    eq_low = (low - mort_amt) if (low is not None and mort_amt is not None) else None
    eq_high = (high - mort_amt) if (high is not None and mort_amt is not None) else None

    # 5) Print one-screen report
    print("")
    print("=" * 68)
    print("REAL PROPERTY SUMMARY (ATTOM)")
    print(f"Generated: {utc_now_str()}")
    print("=" * 68)
    print(f"Input Address:  {address}")
    print(f"ATTOM ID:       {attom_id}")
    print("-" * 68)

    # Ownership (record-based)
    print("OWNERSHIP (record-based)")
    print(f"  Owner(s):     {owner_info['owners']}")
    if owner_info.get("mailing"):
        print(f"  Mailing:      {owner_info['mailing']}")
    print("-" * 68)

    # Property profile
    print("PROPERTY PROFILE")
    print(f"  Type:         {profile['property_type'] or 'N/A'}")
    print(f"  Year Built:   {profile['year_built'] or 'N/A'}")
    print(f"  Beds/Baths:   {profile['beds'] or 'N/A'} / {profile['baths'] or 'N/A'}")
    print(f"  Living Area:  {profile['living_sqft'] or 'N/A'} sq ft")
    la = profile.get("lot_acres")
    ls = profile.get("lot_sqft")
    lot_str = f"{la:.6f} acres" if isinstance(la, (int, float)) else (str(la) if la else "N/A")
    if ls:
        lot_str += f"  ({ls:,} sq ft)"
    print(f"  Lot Size:     {lot_str}")
    if profile.get("pool"):
        print(f"  Pool:         {profile['pool']}")
    print("-" * 68)

    # Valuation (model-based)
    print("VALUATION (ATTOM AVM) — model-based")
    print(f"  AVM Date:     {avm['avm_date'] or 'N/A'}")
    print(f"  Value:        {money(value)}")
    print(f"  Range:        {money(low)}  –  {money(high)}")
    print(f"  Confidence:   {avm['scr'] if avm['scr'] is not None else 'N/A'}   FSD: {avm['fsd'] if avm['fsd'] is not None else 'N/A'}")
    print("-" * 68)

    # Mortgage / lien indicator
    print("RECORDED MORTGAGE (record-based)")
    lender_line = "N/A"
    if mort.get("lender_name"):
        lender_line = mort["lender_name"]
        if mort.get("lender_city") or mort.get("lender_state"):
            lender_line += f" ({mort.get('lender_city') or 'N/A'}, {mort.get('lender_state') or 'N/A'})"
    print(f"  Amount:       {money(mort_amt)}")
    print(f"  Date:         {mort.get('mortgage_date') or 'N/A'}")
    print(f"  Lender:       {lender_line}")
    print(f"  Loan/Rate:    {mort.get('loan_type') or 'N/A'} / {mort.get('rate_type') or 'N/A'}")
    if mort.get("title_company"):
        print(f"  Title Co.:    {mort['title_company']}")
    print("-" * 68)

    # Equity
    print("ESTIMATED EQUITY (computed)")
    print(f"  Equity:       {money(equity)}   (AVM Value - Recorded Mortgage)")
    print(f"  Equity Range: {money(eq_low)}  –  {money(eq_high)}")
    print("-" * 68)

    # Assessment / taxes
    print("ASSESSMENT / TAX (record-based, if available)")
    print(f"  Assessed:     {money(assess.get('assessed_value'))}")
    if assess.get("tax_year") or assess.get("tax_amount"):
        ty = assess.get("tax_year") or "N/A"
        print(f"  Tax:          {money(assess.get('tax_amount'))}  (Year {ty})")
    else:
        print(f"  Tax:          N/A")
    print("-" * 68)

    # Sale
    print("RECENT SALE (record-based, if available)")
    print(f"  Sale Date:    {sale.get('sale_date') or 'N/A'}")
    print(f"  Sale Price:   {money(sale.get('sale_price'))}")
    print("-" * 68)

    # Endpoint status
    def oklabel(http, j):
        return "OK" if (http == 200 and status_ok(j)) else "CHECK"
    status_line = (
        f"ID {oklabel(http_id, j_id)} | "
        f"OWNER {oklabel(*pulls['owner'])} | "
        f"DETAIL {oklabel(*pulls['detail'])} | "
        f"MORT {oklabel(*pulls['mort_owner'])} | "
        f"AVM {oklabel(*pulls['avm'])} | "
        f"ASSESS {oklabel(*pulls['assess'])} | "
        f"SALE {oklabel(*pulls['sales'])}"
    )
    print("DATA INTEGRITY")
    print(f"  Endpoint Status: {status_line}")
    print("  Raw Evidence: attom_property_id.json, attom_owner.json, attom_detail.json,")
    print("               attom_mort_owner.json, attom_avm.json, attom_assess.json, attom_sales.json")
    print("=" * 68)

if __name__ == "__main__":
    main()
