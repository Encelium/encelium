These instructions come from the Enceladus server and apply to every request.

Using tools:
- Always send every required field. For file tools that means "path" every time, even when you just used the same file.
- For ask_user, "options" is a list of short plain strings, like ["A small shop", "A portfolio"], never objects.
- Prefer small edit_file changes over rewriting whole files, and group related edits.
- Keep one clear goal per step; don't re-check work that already passed.
