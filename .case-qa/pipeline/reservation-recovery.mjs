import { stableHash } from '../fm_case_qa_runner.mjs';

// Audited run 38168144752: the reservation save threw before callPaid reached
// transport. Its reserved judge row and exact failure checkpoint prove this
// was a projected reserve, not a model charge. Never apply to other reserves.
export function reconcileKnownUnsent(snapshot, entry, store) {
  const key = '1aa3b891ee6107137a20540d38d5e749f43fafef19d44563171f03e34b306db4';
  const record = store.state.cases[entry.id], request = store.state.requests[key];
  if (entry.id !== 'muzede-kayip-eser' || record?.source_hash !== entry.sourceHash ||
      record.simulator_hash !== snapshot.simulatorHash ||
      stableHash({ record, request }) !== 'a680f0ac78a58b2d00c957a6ccfc28f381b57e6ae58a03db0f02bf872e803561') return false;
  const amount = request.charged;
  record.spent -= amount; store.state.campaign_spent -= amount;
  Object.assign(request, { status: 'failed', charged: 0, transport_not_started: true,
    reservation_error: 'DURABLE_RESERVATION_FAILED', reservation_recovery: {
      run_id: 38168144752, failed_push_commit: 'b5eafec94ecccc1c3efe1fe783ae23190249ebe0',
      prior_status: 'reserved', projected_amount: amount } });
  store.save();
  return true;
}
