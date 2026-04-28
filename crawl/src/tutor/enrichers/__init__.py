"""导师外部数据源补充器（OpenAlex / AMiner / 百度学术 等）"""

from src.tutor.enrichers.openalex_enricher import enrich_from_openalex

__all__ = ["enrich_from_openalex"]
