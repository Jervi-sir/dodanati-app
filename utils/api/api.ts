export const SERVER_IP = 'https://dodanati.octaprize.com';
export const SERVER_URL = SERVER_IP;
export const BASE_URL = SERVER_URL + '/api/v1/';

export const ApiRoutes = {
  taxonomy: {
    categories: 'taxonomy/road-hazard-categories',
  },

  device: {
    auth: 'device/auth'
  },

  feedback: 'feedback',

  hazardsRouteSummary: 'hazards-route-summary',

  hazards: {
    store: 'hazards',
    bulk: 'hazards/bulk',
    history: 'hazards/history',
    nearby: 'hazards/nearby',

    update: 'hazards/:hazard_id',
    delete: 'hazards/:hazard_id'
  }

}

// @ts-ignore
export const buildRoute = (route, params = {}) => {
  let path = route;
  // Replace all :param placeholders with values from params object
  Object.keys(params).forEach((key) => {
    // @ts-ignore
    path = path.replace(`:${key}`, params[key]);
  });
  // Remove leading slash if present to avoid double slashes
  path = path.replace(/^\//, '');
  return `${BASE_URL}${path}`;
};