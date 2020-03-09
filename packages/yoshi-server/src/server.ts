import path from 'path';
import { parse as parseUrl } from 'url';
import { RequestHandler, Request, Response } from 'express';
// @ts-ignore - missing types
import Youch from 'youch';
import globby from 'globby';
import { send } from 'micro';
import importFresh from 'import-fresh';
import requireHttps from 'wix-express-require-https';
import { ROUTES_BUILD_DIR } from 'yoshi-config/build/paths';
import { InternalServerError } from './httpErrors';
import { RouteFunction } from './types';
import { relativeFilePath, pathMatch, connectToYoshiServerHMR } from './utils';

export type Route = {
  route: string;
  handler: (
    req: Request,
    res: Response,
    params: { [param: string]: any },
  ) => void;
};

export default class Server {
  private context: any;
  private routes: Array<Route>;

  constructor(context: any) {
    this.context = context;

    this.routes = this.createRoutes();

    if (process.env.NODE_ENV === 'development') {
      const socket = connectToYoshiServerHMR();

      socket.onmessage = async () => {
        try {
          this.routes = this.createRoutes();
        } catch (error) {
          socket.send(JSON.stringify({ success: false }));
        }

        socket.send(JSON.stringify({ success: true }));
      };
    }
  }

  public handle: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const { pathname } = parseUrl(req.url as string, true);

      for (const { handler, route } of this.routes) {
        const params = pathMatch(route, pathname as string);

        if (params) {
          await new Promise(resolve => requireHttps(req, res, resolve));
          return await handler(req, res, params);
        }
      }
    } catch (error) {
      if (
        process.env.NODE_ENV === 'production' ||
        process.env.IS_INTEGRATION_TEST_PROD === 'true'
      ) {
        return next(new InternalServerError('internal server error', error));
      }

      const youch = new Youch(error, req);
      const html: string = await youch.toHTML();

      return send(res, 500, html);
    }

    if (process.env.NODE_ENV === 'production') {
      // If Yoshi Server did not find anything, pass the request on
      return next();
    }

    return send(res, 404, 'not found');
  };

  private createRoutes(): Array<Route> {
    const routesBuildDir = path.resolve(ROUTES_BUILD_DIR);

    const serverChunks = globby.sync('**/*.js', {
      cwd: routesBuildDir,
      absolute: true,
    });

    return serverChunks.map(absolutePath => {
      const chunk = importFresh(absolutePath) as RouteFunction<any>;
      const relativePath = `/${relativeFilePath(routesBuildDir, absolutePath)}`;
      // Change `/users/[userid]` to `/users/:userid`
      const routePath = relativePath.replace(/\[(\w+)\]/g, ':$1');
      return {
        route:
          // TODO: refactor
          routePath === '/index'
            ? '/'
            : path.basename(routePath) === 'index'
            ? routePath.replace('/' + path.basename(routePath), '')
            : routePath,
        handler: async (req, res, params) => {
          const fnThis = {
            context: this.context,
            req,
            res,
            params,
          };

          const result = await chunk.call(fnThis);
          if (result) {
            // In case that the user is adding both custom response and return value:
            // ```
            // this.res.send('hello');
            // return 'hello2';
            // ```
            if (res.headersSent) {
              console.log(
                'Cannot return a response since `this.req` has been used to sent back the request',
              );
            } else {
              return send(res, 200, result);
            }
          }
        },
      };
    });
  }
}
