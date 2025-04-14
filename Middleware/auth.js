import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentication token is required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(500).json({ message: 'Authentication error', error: error.message });
  }
};

export const isCandidate = (req, res, next) => {
  if (req.user && req.user.role === 'candidate') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Candidate access required.' });
  }
};

export const isRecruiter = (req, res, next) => {
  if (req.user && req.user.role === 'recruiter') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Recruiter access required.' });
  }
};