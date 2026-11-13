import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { User, IUser, Workspace, IWorkspace, WorkspaceMember, WorkspaceRole } from '../../database/models';
import mongoose from 'mongoose';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      workspace?: IWorkspace;
      userRole?: WorkspaceRole | 'superadmin';
    }
  }
}

const roleHierarchy: Record<WorkspaceRole | 'superadmin', number> = {
  superadmin: 100,
  owner: 80,
  admin: 60,
  manager: 40,
  viewer: 20,
};

/**
 * Authentication Middleware: Validates Bearer JWT Token
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = AuthService.verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }

  const user = await User.findById(payload.userId);
  if (!user || !user.is_active) {
    res.status(403).json({ error: 'User not found or account deactivated.' });
    return;
  }

  req.user = user;
  next();
}

/**
 * Workspace isolation & membership middleware
 */
export function requireWorkspace(minRole: WorkspaceRole = 'viewer') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const workspaceId =
      (req.headers['x-workspace-id'] as string) ||
      (req.query.workspaceId as string) ||
      req.body.workspace_id;

    if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      res.status(400).json({ error: 'Valid x-workspace-id header or workspaceId parameter required.' });
      return;
    }

    // Super admin can inspect any workspace
    if (req.user.role === 'superadmin') {
      const ws = await Workspace.findById(workspaceId);
      if (!ws) {
        res.status(404).json({ error: 'Workspace not found.' });
        return;
      }
      req.workspace = ws;
      req.userRole = 'superadmin';
      return next();
    }

    const member = await WorkspaceMember.findOne({
      workspace_id: workspaceId,
      user_id: req.user._id,
      status: 'active',
    });

    if (!member) {
      res.status(403).json({ error: 'Access denied. You are not a member of this workspace.' });
      return;
    }

    const ws = await Workspace.findById(workspaceId);
    if (!ws) {
      res.status(404).json({ error: 'Workspace not found.' });
      return;
    }

    if (ws.status === 'suspended') {
      res.status(403).json({ error: 'Workspace is currently suspended. Contact support.' });
      return;
    }

    // Check role permission
    const currentRoleLevel = roleHierarchy[member.role] || 0;
    const requiredRoleLevel = roleHierarchy[minRole] || 0;

    if (currentRoleLevel < requiredRoleLevel) {
      res.status(403).json({ error: `Insufficient permissions. Required role: ${minRole}, current role: ${member.role}` });
      return;
    }

    req.workspace = ws;
    req.userRole = member.role;
    next();
  };
}

/**
 * Platform Superadmin only middleware
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'superadmin') {
    res.status(403).json({ error: 'Platform Superadmin access required.' });
    return;
  }
  next();
}
