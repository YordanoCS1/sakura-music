"""Guarda respuestas reales de las APIs como fixtures para los tests.

Se ejecuta una vez, con red. Despues los tests corren offline contra
`tests/data/`, porque depender de una API externa en la suite hace que falle
por causas que no son del codigo.

    python scripts/grab_fixtures.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sakura.core import metadata_sources as ms

DESTINO = Path(__file__).resolve().parent.parent / "tests" / "data"

CASOS = {
    "itunes_search": "daft punk one more time",
    "itunes_search_ingles": "the beatles yesterday",
    "itunes_search_sin_resultado": "xyzqwertyuiopasdfghjkl nonexistent 12345",
    "itunes_album": "697194953",
    "deezer_search": "daft punk one more time",
}


def main() -> int:
    DESTINO.mkdir(parents=True, exist_ok=True)
    saved = 0

    # Usa los mismos constructores de URL que la app: si el script armara la
    # URL a mano, un parametro olvidado (entity=song) traeria peliculas.
    for name_text, query in CASOS.items():
        if name_text.startswith("itunes"):
            url = (
                ms.itunes_album_url(query)
                if name_text.endswith("album")
                else ms.itunes_search_url(query)
            )
        else:
            url = ms.deezer_search_url(query)

        try:
            data = ms._request(url)
        except ms.SourceError as exc:
            print(f"{name_text}: fallo ({exc})")
            continue

        (DESTINO / f"{name_text}.json").write_text(
            json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        total = data.get("resultCount", len(data.get("data", [])))
        print(f"{name_text}.json  <- {query!r} ({total} resultados)")
        saved += 1

    print(f"\n{saved} fixtures en {DESTINO}")
    return 0 if saved else 1


if __name__ == "__main__":
    raise SystemExit(main())