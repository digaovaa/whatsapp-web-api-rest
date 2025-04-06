import { Request, Response, NextFunction } from 'express';

/**
 * Admin authorization middleware
 * Ensures the user has admin privileges
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  // Check if user is authenticated and has admin role
  const user = (req as any).user;
  
  if (!user || !user.isAdmin) {
    res.status(403).json({
      success: false,
      message: 'Admin privileges required'
    });
    return;
  }
  
  // Continue to the next middleware or route handler
  next();
};
