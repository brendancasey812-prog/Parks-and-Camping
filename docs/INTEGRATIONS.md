# Trip Planner: connecting booking sites

What works today
- Each plan links out to the right booking site (Recreation.gov search or campground page when a Facility ID is set, ReserveAmerica, ReserveCalifornia, Hipcamp, AllTrails).
- "Import a booking confirmation" reads dates, confirmation number, provider, campground and link from pasted text, entirely in the browser.
- "Export calendar (.ics)" produces a file Google Calendar, Apple Calendar and Outlook can import.
- Plans are stored in `localStorage["trips"]` and travel in backups (`settings.trips`). Provider API keys typed in "Booking sites & connections" are stored in `localStorage["integrations"]` and are deliberately **not** included in backups.

Where automatic links plug in
`trips.js` exposes `window.TripIntegrations`. Each site is a registered adapter that currently reports `status: "planned"`:

```js
TripIntegrations.register({
  id: "recreation.gov",
  name: "Recreation.gov",
  status: "connected",                       // "planned" | "connected" | "error"
  searchCampgrounds(query){ /* -> Promise<[{facilityId,name,parkId,lat,lng}]> */ },
  getAvailability({facilityId,start,end}){ /* -> Promise<[{site,date,available}]> */ },
  listReservations(){ /* -> Promise<[{confirmation,facilityId,start,end,site,url}]> */ }
});
```
A plan stores `res.provider`, `res.facility`, `res.site`, `res.confirmation` and `res.url`, so an adapter can read and write those fields without a data migration. The UI calls the adapter methods that exist; the defaults reject with "not connected yet".

Recreation.gov notes for whoever builds the sync
- Facility and campground data: the RIDB API, `https://ridb.recreation.gov/api/v1/` (free API key, sent as the `apikey` header).
- Availability and booking are not part of RIDB. Recreation.gov's own availability endpoints are undocumented and can change.
- Browsers will block most of these calls (CORS) and an API key must not ship in public page code. The realistic design is a small serverless proxy (Cloudflare Worker, Netlify or Vercel function) that holds the key and forwards `search` and `availability` requests; the site then calls the proxy. Reservation history needs the user's own login, so use a forwarded-email or `.ics` import instead of scraping.
- Respect each site's terms of service and rate limits.

Other sites
- ReserveCalifornia and ReserveAmerica (both Aspira/Tyler products) have no public API; start with link-outs and confirmation-email import.
- Hipcamp and AllTrails have partner programs only.
- NPS.gov park alerts are available from the NPS Data API (free key) and would suit a "closures for your dates" banner on each plan.
- Google Calendar two-way sync needs an OAuth app; the `.ics` export is the no-login stand-in.
