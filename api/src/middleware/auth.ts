import { Request, Response, NextFunction } from 'express';

/**
 * Authentication middleware
 * This is a placeholder - replace with your actual authentication logic
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  // Example authentication check
  // You should implement your own authentication logic:
  // - JWT validation
  // - Session-based auth
  // - OAuth, etc.
  
  // Para compatibilidade com a coleção Postman, aceite Authorization ou header `token`/`Token`.
  const authHeader = req.headers.authorization || (req.headers['token'] as string) || (req.headers['Token'] as unknown as string);
  
  if (!authHeader) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }
  
  // Add user info to request object
  (req as any).user = {
    id: 'placeholder-user-id', // Replace with actual user ID
    isAdmin: false
  };
  
  // Continue to the next middleware or route handler
  next();
};
