import type { User } from "../shared/schema"; // update the import path

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}
