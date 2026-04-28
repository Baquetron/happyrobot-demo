import httpx
from fastapi import APIRouter, Depends, HTTPException

from ..auth import require_api_key
from ..config import settings
from ..schemas import CarrierVerification

router = APIRouter(prefix="/carriers", tags=["carriers"], dependencies=[Depends(require_api_key)])


@router.get("/verify", response_model=CarrierVerification)
async def verify(mc: str):
    mc_clean = mc.upper().replace("MC-", "").replace("MC", "").strip()
    if not mc_clean.isdigit():
        raise HTTPException(400, "Invalid MC number")

    url = f"{settings.fmcsa_base_url}/carriers/docket-number/{mc_clean}"
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(url, params={"webKey": settings.fmcsa_web_key})
        except httpx.HTTPError as e:
            raise HTTPException(502, f"FMCSA upstream error: {e}")

    if r.status_code != 200:
        raise HTTPException(502, f"FMCSA returned {r.status_code}")

    try:
        data = r.json()
    except ValueError:
        raise HTTPException(502, "FMCSA returned non-JSON response")

    content = data.get("content") or []
    if not content:
        return CarrierVerification(
            mc_number=mc_clean,
            eligible=False,
            reason="Carrier not found in FMCSA",
        )

    carrier = content[0].get("carrier", {})
    allowed = carrier.get("allowedToOperate")
    status_code = carrier.get("statusCode")
    oos_date = carrier.get("oosDate")
    eligible = allowed == "Y" and status_code == "A" and oos_date is None

    reason: str | None = None
    if not eligible:
        if allowed != "Y":
            reason = "Carrier not allowed to operate"
        elif status_code != "A":
            reason = f"Carrier status is {status_code}"
        elif oos_date is not None:
            reason = f"Out of service since {oos_date}"

    return CarrierVerification(
        mc_number=mc_clean,
        eligible=eligible,
        legal_name=carrier.get("legalName"),
        dba_name=carrier.get("dbaName"),
        status=status_code,
        allowed_to_operate=allowed,
        reason=reason,
    )
