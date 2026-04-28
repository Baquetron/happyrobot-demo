import re

import httpx

from ..config import settings
from ..schemas import CarrierVerification


_MC_RE = re.compile(r"\d+")


def _normalize_mc(raw: str) -> str | None:
    if not raw:
        return None
    digits = "".join(_MC_RE.findall(raw))
    return digits or None


async def verify_mc_number(raw_mc: str) -> CarrierVerification:
    mc = _normalize_mc(raw_mc)
    if not mc:
        return CarrierVerification(
            mc_number=raw_mc, eligible=False, reason="MC number could not be parsed"
        )

    if not settings.fmcsa_web_key:
        # Demo fallback: deterministic stub. Even MC numbers eligible, odd not.
        eligible = int(mc) % 2 == 0
        return CarrierVerification(
            mc_number=mc,
            eligible=eligible,
            legal_name=f"Demo Carrier {mc}",
            status="ACTIVE" if eligible else "INACTIVE",
            allowed_to_operate="Y" if eligible else "N",
            reason=None if eligible else "Carrier not authorized (demo stub)",
        )

    url = f"{settings.fmcsa_base_url}/carriers/docket-number/{mc}"
    params = {"webKey": settings.fmcsa_web_key}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        return CarrierVerification(
            mc_number=mc, eligible=False, reason=f"FMCSA lookup failed: {e}"
        )

    content = data.get("content")
    if not content:
        return CarrierVerification(
            mc_number=mc, eligible=False, reason="No carrier found for that MC number"
        )

    # FMCSA may return a single object or list; handle both.
    record = content[0] if isinstance(content, list) else content
    carrier = record.get("carrier", record)

    allowed = carrier.get("allowedToOperate")
    status_code = carrier.get("statusCode")
    eligible = (allowed == "Y") and (status_code in (None, "A"))

    return CarrierVerification(
        mc_number=mc,
        eligible=eligible,
        legal_name=carrier.get("legalName"),
        dba_name=carrier.get("dbaName"),
        status="ACTIVE" if status_code == "A" else (status_code or "UNKNOWN"),
        allowed_to_operate=allowed,
        reason=None if eligible else "Carrier not authorized to operate",
    )
