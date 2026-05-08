// Usage: router.get('/path', authenticate, authorize('resource:action'), handler)
export function authorize(permission) {
  return (req, res, next) => {
    const user = req.user;
    if (user?.is_super || user?.permissions?.includes(permission)) {
      return next();
    }
    res.status(403).json({ error: 'Forbidden' });
  };
}
