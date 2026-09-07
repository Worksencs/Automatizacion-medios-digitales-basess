// Windows fallback for environments where libuv cannot resolve the current user.
if (typeof process.geteuid !== "function") process.geteuid = () => 0;
