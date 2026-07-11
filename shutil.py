import atexit


def apply_voice_patch_after_build():
    try:
        import patch_openai_realtime  # noqa: F401
    except Exception as exc:
        print('[Tycoons] OpenAI Realtime patch skipped:', exc)
    try:
        import patch_openai_full_duplex  # noqa: F401
    except Exception as exc:
        print('[Tycoons] OpenAI full-duplex patch skipped:', exc)


atexit.register(apply_voice_patch_after_build)
