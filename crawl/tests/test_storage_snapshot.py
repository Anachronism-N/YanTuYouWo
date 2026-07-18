"""快照存储健壮性测试 —— 写盘失败不得影响通知入库。"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

from src.storage.snapshot import save_snapshot, load_snapshot


def test_save_and_load_roundtrip(tmp_path_factory=None):
    import tempfile
    from src import config as cfg
    with tempfile.TemporaryDirectory() as d:
        cfg.settings.HTML_SNAPSHOT_DIR = d
        path = save_snapshot("<html><body>hi</body></html>", "http://e.edu.cn/x")
        assert path is not None
        assert os.path.exists(path)
        # load 回来内容一致
        loaded = load_snapshot(path)
        assert loaded == "<html><body>hi</body></html>"
    print("  ✅ 快照保存/读取往返")


def test_save_failure_returns_none_not_raise():
    """写盘失败（目录不可写/路径非法）应返回 None，不抛异常"""
    from src import config as cfg
    # Windows 非法路径字符
    old = cfg.settings.HTML_SNAPSHOT_DIR
    try:
        cfg.settings.HTML_SNAPSHOT_DIR = "Z:\\/???/nonexistent::::"  # 非法路径
        # 不应抛异常
        result = save_snapshot("<html>x</html>", "http://e.edu.cn/y")
        assert result is None
    finally:
        cfg.settings.HTML_SNAPSHOT_DIR = old
    print("  ✅ 写盘失败返回 None（不影响入库）")


def test_save_none_html():
    from src import config as cfg
    old = cfg.settings.HTML_SNAPSHOT_DIR
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        cfg.settings.HTML_SNAPSHOT_DIR = d
        assert save_snapshot(None, "http://e.edu.cn/z") is None
        assert save_snapshot("", "http://e.edu.cn/z") is None
    cfg.settings.HTML_SNAPSHOT_DIR = old
    print("  ✅ None/空 HTML 返回 None")


def test_save_handles_bad_encoding():
    """含 lone surrogate 等坏字符的 HTML 不应导致编码失败"""
    import tempfile
    from src import config as cfg
    with tempfile.TemporaryDirectory() as d:
        cfg.settings.HTML_SNAPSHOT_DIR = d
        bad = "<html>" + "\udcff" + "</html>"  # lone surrogate
        result = save_snapshot(bad, "http://e.edu.cn/bad")
        assert result is not None  # errors=replace 兜住，不崩
    print("  ✅ 坏字符 HTML 不崩（errors=replace）")


if __name__ == "__main__":
    print("=== 快照存储健壮性测试 ===")
    test_save_and_load_roundtrip()
    test_save_failure_returns_none_not_raise()
    test_save_none_html()
    test_save_handles_bad_encoding()
    print("\n🎉 所有快照存储测试通过!")
