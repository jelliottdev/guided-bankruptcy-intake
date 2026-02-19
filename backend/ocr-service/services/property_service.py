import os
import requests
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class PropertyService:
    BASE_URL = "https://api.gateway.attomdata.com/propertyapi/v1.0.0"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ATTOM_API_KEY")
        if not self.api_key:
            logger.warning("ATTOM_API_KEY not set. Property reports will fail.")

    def _call_attom(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        if not self.api_key:
            raise ValueError("ATTOM API key is missing")
            
        url = f"{self.BASE_URL}{endpoint}"
        headers = {"Accept": "application/json", "APIKey": self.api_key}
        
        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"ATTOM API error: {e}")
            if e.response is not None:
                try:
                    return e.response.json()
                except ValueError:
                    pass
            raise Exception(f"Failed to fetch data from ATTOM: {str(e)}")

    def _safe_get(self, d: Any, path: list, default: Any = None) -> Any:
        cur = d
        try:
            for p in path:
                if isinstance(p, int):
                    if isinstance(cur, list) and 0 <= p < len(cur):
                        cur = cur[p]
                    else:
                        return default
                else:
                    if isinstance(cur, dict):
                        cur = cur.get(p)
                    else:
                        return default
            return default if cur is None else cur
        except Exception:
            return default

    def generate_report(self, address: str) -> Dict[str, Any]:
        # 1. Resolve ID
        logger.info(f"Resolving address: {address}")
        id_data = self._call_attom("/property/id", params={"address": address})
        status_code = self._safe_get(id_data, ["status", "code"])
        
        if status_code != 0:
            msg = self._safe_get(id_data, ["status", "msg"], "Unknown error")
            raise ValueError(f"Could not resolve property ID: {msg}")

        attom_id = self._safe_get(id_data, ["property", 0, "identifier", "attomId"])
        if not attom_id:
            raise ValueError("No attomId found in response")

        # 2. Fetch Details
        logger.info(f"Fetching details for ID: {attom_id}")
        
        # We fetch these sequentially for simplicity, could be parallelized
        try:
            owner_data = self._call_attom("/property/detailowner", params={"id": attom_id})
            detail_data = self._call_attom("/property/detail", params={"id": attom_id})
            mort_data = self._call_attom("/property/detailmortgageowner", params={"id": attom_id})
            avm_data = self._call_attom("/attomavm/detail", params={"id": attom_id})
            assess_data = self._call_attom("/assessment/detail", params={"id": attom_id})
            sales_data = self._call_attom("/sale/detail", params={"id": attom_id})
        except Exception as e:
            logger.error(f"Error fetching property details: {e}")
            raise

        # 3. Extract Data
        report = {
            "address": address,
            "attom_id": attom_id,
            "owner": self._extract_owner(owner_data),
            "profile": self._extract_profile(detail_data),
            "mortgage": self._extract_mortgage(mort_data),
            "valuation": self._extract_avm(avm_data),
            "assessment": self._extract_assessment(assess_data),
            "sale": self._extract_sale(sales_data),
        }

        # 4. Computed Equity
        val = report["valuation"].get("value")
        mort_amt = report["mortgage"].get("amount")
        
        if val is not None and mort_amt is not None:
            try:
                report["equity"] = {
                    "estimated_value": val - mort_amt,
                    "low": (report["valuation"].get("low") or val) - mort_amt,
                    "high": (report["valuation"].get("high") or val) - mort_amt
                }
            except (TypeError, ValueError):
                report["equity"] = None
        else:
            report["equity"] = None

        return report

    def _extract_owner(self, json_data):
        p = self._safe_get(json_data, ["property", 0], {})
        o = self._safe_get(p, ["owner"], {}) or {}
        
        owner1 = self._safe_get(o, ["owner1", "fullname"])
        owner2 = self._safe_get(o, ["owner2", "fullname"])
        owners = [x for x in [owner1, owner2] if x]
        
        return {
            "names": owners,
            "formatted_string": " & ".join(owners) if owners else "N/A",
            "mailing_address": self._safe_get(o, ["mailingaddressoneline"]),
            "is_corporate": self._safe_get(o, ["corporateindicator"]),
            "is_absentee": self._safe_get(o, ["absenteeownerstatus"])
        }

    def _extract_profile(self, json_data):
        p = self._safe_get(json_data, ["property", 0], {})
        summary = self._safe_get(p, ["summary"], {}) or {}
        building = self._safe_get(p, ["building"], {}) or {}
        size = self._safe_get(building, ["size"], {}) or {}
        rooms = self._safe_get(building, ["rooms"], {}) or {}
        lot = self._safe_get(p, ["lot"], {}) or {}

        return {
            "type": self._safe_get(summary, ["propertyType"]) or self._safe_get(summary, ["propclass"]),
            "year_built": self._safe_get(summary, ["yearbuilt"]),
            "beds": self._safe_get(rooms, ["beds"]),
            "baths": self._safe_get(rooms, ["bathstotal"]),
            "sqft": self._safe_get(size, ["livingsize"]) or self._safe_get(size, ["bldgsize"]),
            "lot_acres": self._safe_get(lot, ["lotsize1"]),
            "lot_sqft": self._safe_get(lot, ["lotsize2"]),
            "pool": self._safe_get(lot, ["pooltype"])
        }

    def _extract_mortgage(self, json_data):
        p = self._safe_get(json_data, ["property", 0], {})
        m = self._safe_get(p, ["mortgage"], {}) or {}
        lender = self._safe_get(m, ["lender"], {}) or {}
        title = self._safe_get(m, ["title"], {}) or {}

        return {
            "amount": self._safe_get(m, ["amount"]),
            "date": self._safe_get(m, ["date"]),
            "loan_type": self._safe_get(m, ["loantypecode"]),
            "rate_type": self._safe_get(m, ["interestratetype"]),
            "lender": {
                "name": self._safe_get(lender, ["lastname"]),
                "city": self._safe_get(lender, ["city"]),
                "state": self._safe_get(lender, ["state"])
            },
            "title_company": self._safe_get(title, ["companyname"])
        }

    def _extract_avm(self, json_data):
        p = self._safe_get(json_data, ["property", 0], {})
        avm = self._safe_get(p, ["avm"], {}) or {}
        amt = self._safe_get(avm, ["amount"], {}) or {}

        return {
            "date": self._safe_get(avm, ["eventDate"]),
            "value": self._safe_get(amt, ["value"]),
            "low": self._safe_get(amt, ["low"]),
            "high": self._safe_get(amt, ["high"]),
            "confidence_score": self._safe_get(amt, ["scr"]),
            "fsd": self._safe_get(amt, ["fsd"])
        }

    def _extract_assessment(self, json_data):
        p = self._safe_get(json_data, ["property", 0], {})
        a = self._safe_get(p, ["assessment"], {}) or {}

        return {
            "assessed_value": self._safe_get(a, ["assessed", "assdTtlValue"]) or self._safe_get(a, ["assessedValue"]),
            "tax_amount": self._safe_get(a, ["tax", "taxamt"]) or self._safe_get(a, ["taxAmount"]),
            "tax_year": self._safe_get(a, ["tax", "taxyear"]) or self._safe_get(a, ["taxYear"])
        }

    def _extract_sale(self, json_data):
        p = self._safe_get(json_data, ["property", 0], {})
        sale = self._safe_get(p, ["sale"], {}) or {}

        return {
            "price": self._safe_get(sale, ["amount", "saleamt"]) or self._safe_get(sale, ["saleamt"]),
            "date": self._safe_get(sale, ["saleTransDate"]) or self._safe_get(sale, ["salesearchdate"]) or self._safe_get(sale, ["date"])
        }
