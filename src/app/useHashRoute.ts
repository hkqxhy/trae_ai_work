import { useCallback, useEffect, useState } from "react";
import { routes } from "../data/routes";
import type { AppRouteId } from "../models/renting";

const routeIds = new Set<AppRouteId>(routes.map((route) => route.id));

export function getRouteHash(route: AppRouteId) {
  return `#/${route}`;
}

export function readRouteFromHash(hash = typeof window === "undefined" ? "" : window.location.hash) {
  const route = hash.replace(/^#\/?/, "").split(/[/?]/)[0] as AppRouteId;
  return routeIds.has(route) ? route : "overview";
}

export function useHashRoute(): [AppRouteId, (route: AppRouteId) => void] {
  const [activeRoute, setActiveRoute] = useState<AppRouteId>(() => readRouteFromHash());

  useEffect(() => {
    if (window.location.hash !== getRouteHash(activeRoute)) {
      window.history.replaceState(null, "", getRouteHash(activeRoute));
    }

    function handleHashChange() {
      setActiveRoute(readRouteFromHash());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = useCallback((route: AppRouteId) => {
    if (readRouteFromHash() === route) {
      setActiveRoute(route);
      return;
    }
    window.location.hash = `/${route}`;
  }, []);

  return [activeRoute, navigate];
}
