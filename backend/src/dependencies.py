"""FastAPI 依赖注入"""

from fastapi import Query


class PaginationParams:
    """分页参数依赖"""

    def __init__(
        self,
        page: int = Query(1, ge=1, description="页码"),
        size: int = Query(20, ge=1, le=100, description="每页数量"),
    ):
        self.page = page
        self.size = size
        self.offset = (page - 1) * size
