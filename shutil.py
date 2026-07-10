import atexit


def apply_voice_patch_after_build():
    try:
        import patch_voice_direct_agent  # noqa: F401
    except Exception as exc:
        print('[Tycoons] direct ElevenLabs voice patch skipped:', exc)
    try:
        import patch_voice_stop_toggle  # noqa: F401
    except Exception as exc:
        print('[Tycoons] voice stop-toggle patch skipped:', exc)


atexit.register(apply_voice_patch_after_build)
