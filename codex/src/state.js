const routeState = new Map();

export function getRouteState(routeId) {
  return routeState.get(routeId) ?? {};
}

export function patchRouteState(routeId, nextState) {
  routeState.set(routeId, {
    ...getRouteState(routeId),
    ...nextState
  });
}

export function replaceRouteState(routeId, nextState) {
  routeState.set(routeId, nextState);
}

export function clearRouteState(routeId) {
  routeState.delete(routeId);
}
