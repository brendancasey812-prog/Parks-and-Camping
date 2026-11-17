// Unit tests for the release-time engine: node tests/engine.test.cjs
const E=require('../engine.js');let n=0,f=0;
const eq=(name,a,b)=>{n++;if(a!==b){f++;console.log('FAIL',name,'\n   got ',a,'\n   want',b)}else console.log('PASS',name)};
const Z=d=>d&&d.at.toISOString();
const R6={kind:'rolling',months:6,time:'07:00'},RC={kind:'rolling',months:6,time:'08:00'},Y={kind:'monthly',blockStart:15,monthsAhead:5,time:'07:00'};
eq('Recreation.gov: Apr 26 2027 opens Oct 26 2026 7:00 AM PDT',Z(E.releaseFor(R6,'2027-04-26')),'2026-10-26T14:00:00.000Z');
eq('ReserveCalifornia: Apr 30 2027 opens Oct 30 2026 8:00 AM PDT',Z(E.releaseFor(RC,'2027-04-30')),'2026-10-30T15:00:00.000Z');
// Month ends follow ReserveCalifornia's published example (parks.ca.gov/29676): a night opens on the first day the window reaches it
eq('Winter time: May 30 2027 opens Nov 30 2026 7:00 AM PST',Z(E.releaseFor(R6,'2027-05-30')),'2026-11-30T15:00:00.000Z');
eq('No Nov 31: May 31 2027 opens Dec 1 2026',Z(E.releaseFor(R6,'2027-05-31')),'2026-12-01T15:00:00.000Z');
eq('ReserveCalifornia example: Aug 28 opens Feb 28 at 8 AM',Z(E.releaseFor(RC,'2027-08-28')),'2027-02-28T16:00:00.000Z');
eq('ReserveCalifornia example: Aug 29 opens Mar 1',Z(E.releaseFor(RC,'2027-08-29')),'2027-03-01T16:00:00.000Z');
eq('ReserveCalifornia example: Aug 31 opens Mar 1',Z(E.releaseFor(RC,'2027-08-31')),'2027-03-01T16:00:00.000Z');
eq('Leap year: Aug 29 2028 opens Feb 29 2028',Z(E.releaseFor(RC,'2028-08-29')),'2028-02-29T16:00:00.000Z');
eq('Leap year: Aug 31 2028 opens Mar 1 2028',Z(E.releaseFor(RC,'2028-08-31')),'2028-03-01T16:00:00.000Z');
const mar1=E.nextReleases(RC,new Date('2027-02-28T20:00:00Z'),1)[0];
eq('Mar 1 2027 release opens Aug 29 through Sep 1 together',mar1.at.toISOString()+' '+mar1.from+' '+mar1.to,'2027-03-01T16:00:00.000Z 2027-08-29 2027-09-01');
const dec=E.nextReleases(R6,new Date('2026-12-30T20:00:00Z'),1)[0];
eq('Dec 31 opens nothing new (no Jun 31); Jan 1 opens Jul 1',dec.at.toISOString()+' '+dec.from+' '+dec.to,'2027-01-01T15:00:00.000Z 2027-07-01 2027-07-01');
eq('Measured (Recreation.gov, 11/16/2026): May 16 2027 opened Nov 16 2026 7:00 AM',Z(E.releaseFor(R6,'2027-05-16')),'2026-11-16T15:00:00.000Z');
// Yosemite "five months in advance on the 15th": measured, the 10/15 release opened arrivals through 3/14 and the 11/15 release through 4/14
eq('Yosemite measured: Nov 15 2026 opens Mar 15 - Apr 14 2027',(()=>{const r=E.releaseFor(Y,'2027-04-01');return Z(r)+' '+r.from+' '+r.to})(),'2026-11-15T15:00:00.000Z 2027-03-15 2027-04-14');
eq('Yosemite block: Jul 20 2027 opens Mar 15 2027 7:00 AM PDT',Z(E.releaseFor(Y,'2027-07-20')),'2027-03-15T14:00:00.000Z');
eq('Yosemite block dates: Jul 20 2027',E.releaseFor(Y,'2027-07-20').from+' to '+E.releaseFor(Y,'2027-07-20').to,'2027-07-15 to 2027-08-14');
eq('Yosemite block: Jul 10 2027 is in the Jun 15-Jul 14 block, opens Feb 15 2027',E.releaseFor(Y,'2027-07-10').from+' '+Z(E.releaseFor(Y,'2027-07-10')),'2027-06-15 2027-02-15T15:00:00.000Z');
eq('Camp 4 style: 7 days ahead',Z(E.releaseFor({kind:'days',days:7,time:'07:00'},'2027-05-10')),'2027-05-03T14:00:00.000Z');
eq('No rule returns null',String(E.releaseFor({kind:'none'},'2027-05-10')),'null');
eq('DST end day: Nov 1 2026 7:00 AM is PST (15:00Z)',E.ptInstant(2026,11,1,7,0).toISOString(),'2026-11-01T15:00:00.000Z');
eq('DST start day: Mar 14 2027 7:00 AM is PDT (14:00Z)',E.ptInstant(2027,3,14,7,0).toISOString(),'2027-03-14T14:00:00.000Z');
const nx=E.nextReleases(R6,new Date('2026-10-26T20:00:00Z'),3);
eq('Next rolling release after Oct 26 1PM PT is Oct 27 and opens Apr 27 2027',nx[0].at.toISOString()+' '+nx[0].from,'2026-10-27T14:00:00.000Z 2027-04-27');
eq('Three releases are consecutive days',nx.map(x=>x.from).join(),'2027-04-27,2027-04-28,2027-04-29');
const ny=E.nextReleases(Y,new Date('2026-10-26T20:00:00Z'),2);
eq('Next Yosemite release is Nov 15 2026 and opens Mar 15-Apr 14 2027',ny[0].at.toISOString()+' '+ny[0].from+' '+ny[0].to,'2026-11-15T15:00:00.000Z 2027-03-15 2027-04-14');
eq('Months label wraps the year',E.monthsLabel([10,11,12,1,2,3,4]),'Oct–Apr');
eq('Months label year-round',E.monthsLabel([1,2,3,4,5,6,7,8,9,10,11,12]),'Year-round');
eq('Months label split',E.monthsLabel([3,4,5,10]),'Mar–May, Oct');
eq('Rule text',E.ruleText(RC),'6 months ahead, new day opens daily at 8:00 AM PT');
eq('Block rule text',E.ruleText({kind:'block',through:'2027-11-21'}),'Released in blocks: open through 11/21/2027; next release not published');
eq('Block rule with nothing released',E.ruleText({kind:'block',through:null}),'Released in blocks: next season not released yet; release date not published');
eq('Block rule has no computed release',String(E.releaseFor({kind:'block',through:'2027-11-21'},'2027-12-15')),'null');
// "Bookable now through" (measured on Recreation.gov 11/16/2026 at 8:30 PM PT: 6-month rolling open through 5/16, Yosemite through 4/14)
const t1=new Date('2026-11-17T04:30:00Z'),t2=new Date('2026-11-17T14:59:00Z'),t3=new Date('2026-11-17T15:00:00Z');
eq('Bookable now: 6-month rolling on 11/16 evening is through May 16 2027',E.bookableThrough(R6,t1),'2027-05-16');
eq('Bookable now: one minute before 7:00 AM still May 16',E.bookableThrough(R6,t2),'2027-05-16');
eq('Bookable now: at 7:00 AM PST May 17 opens',E.bookableThrough(R6,t3),'2027-05-17');
eq('Bookable now: ReserveCalifornia 8:00 AM release not yet at 7:00 AM',E.bookableThrough(RC,t3),'2027-05-16');
eq('Bookable now: Yosemite after the 11/15 release is through Apr 14 2027',E.bookableThrough(Y,t1),'2027-04-14');
eq('Bookable now: 7 days ahead',E.bookableThrough({kind:'days',days:7,time:'07:00'},t1),'2026-11-23');
eq('Bookable now: fixed block',E.bookableThrough({kind:'block',through:'2027-11-21'},t1),'2027-11-21');
eq('Bookable now: no rule',String(E.bookableThrough({kind:'none'},t1)),'null');
// North Pines 2027: no general sale before 02/15/2027; that release opens 04/16 through 07/14/2027 (NPS lottery page)
{const NP=Object.assign({},Y,{holdUntil:'2027-02-15',holdFrom:'2027-04-16'});const n=E.nextReleases(NP,t1,2);
eq('Hold: nothing bookable before the general sale',String(E.bookableThrough(NP,t1)),'null');
eq('Hold: first release is 02/15/2027 7:00 AM PT for 04/16-07/14/2027',n[0].at.toISOString()+' '+n[0].from+' '+n[0].to,'2027-02-15T15:00:00.000Z 2027-04-16 2027-07-14');
eq('Hold: then the 03/15 release as usual',n[1].from+' '+n[1].to,'2027-07-15 2027-08-14');
eq('Hold: a May arrival opens on 02/15/2027',E.releaseFor(NP,'2027-05-20').at.toISOString(),'2027-02-15T15:00:00.000Z');
eq('Hold: after the hold, through the normal block edge',E.bookableThrough(NP,new Date('2027-03-16T20:00:00Z')),'2027-08-14');
eq('Rule text: 1 month is singular',E.ruleText({kind:'rolling',months:1,time:'07:00'}).slice(0,13),'1 month ahead');}
console.log(n-f+'/'+n+' passed');process.exit(f?1:0);
