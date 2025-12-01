export const SERVER_IP = 'http://192.168.1.103:8000';
export const SERVER_URL = SERVER_IP;
export const BASE_URL = SERVER_URL + '/api/v1/';

export const ApiRoutes = {
  taxonomy: {
    categories: 'taxonomy/road-hazard-categories',
  },

  device: {
    auth: 'device/auth'
  },

  hazardsRouteSummary: 'hazards-route-summary',

  hazards: {
    index: 'hazards',
    history: 'hazards/history',
    nearby: 'hazards/nearby',
    rate: 'hazards/:hazard_id/rate',
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