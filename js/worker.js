// ==========================================
// SAIFA DESIGNS – ARTISAN & WORKER PORTAL
// ==========================================

const WorkerPortal = {
  render() {
    this.showPanel();
  },

  showPanel() {
    const m = S.me;
    if (!m || m.role !== "worker") {
      if (typeof openLogin === "function") openLogin("worker");
      return;
    }

    const myWork = (S.work || []).filter(w => w.wk == m.id);
    const myAssignedOrders = orders().filter(o => o.worker == m.id && !["Delivered", "Cancelled"].includes(o.status));
    const stats = getWorkerMonthlyStats(m.id, curMon);

    // Get today's attendance status
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayAtt = (S.attendance || []).find(at => at.wid == m.id && at.date == todayStr);
    const attStatus = todayAtt ? todayAtt.status : "Not Marked";

    $("pn").innerHTML = `
      <div class="admin-shell">
        <main class="admin-main" style="max-width:860px;margin:auto;padding:20px 4% 90px">
          <!-- Top Header Bar -->
          <div class="admin-top-bar" style="margin-bottom:20px;flex-wrap:wrap;gap:12px">
            <div style="display:flex;align-items:center;gap:14px">
              <div style="width:48px;height:48px;border-radius:50%;overflow:hidden;background:#eee;border:2px solid var(--br);display:grid;place-items:center;flex-shrink:0">
                ${m.img ? `<img src="${Security.escapeHTML(m.img)}" style="width:100%;height:100%;object-fit:cover">` : '<span style="font-size:1.6rem">🧵</span>'}
              </div>
              <div>
                <span class="eyebrow">Artisan & Tailor Portal · ${Security.escapeHTML(m.wid || "Tailor")}</span>
                <h1 style="font-size:1.6rem;margin:0">${Security.escapeHTML(m.name)}</h1>
                <small style="color:var(--gd);font-weight:600">${Security.escapeHTML(m.role || "Craft Master")}</small>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="pill ${attStatus === 'Present' ? 'ok' : attStatus === 'Half-Day' ? 'w' : 'bad'}" style="font-size:0.8rem;padding:6px 12px">
                Today: ${attStatus}
              </span>
              <button class="btn s" onclick="closeAdminPanel()">🏠 Storefront</button>
              <button class="btn s p" onclick="logoutSession()">🚪 Logout</button>
            </div>
          </div>

          <!-- Monthly Earnings & Piece KPI Cards -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-icon">💰</div>
              <small>Verified Gross Earnings (${Security.escapeHTML(curMon)})</small>
              <b style="color:var(--br)">${R(stats.totalEarned)}</b>
              <span class="trend up">${stats.totalPieces} pieces verified &amp; credited</span>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon">⏳</div>
              <small>Pending Master Verification</small>
              <b style="color:var(--warn)">${R(stats.pendingEarned || 0)}</b>
              <span class="trend alert">${stats.pendingPieces || 0} pieces awaiting check</span>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon">💵</div>
              <small>Advance / Paid Amount</small>
              <b style="color:var(--ok)">${R(stats.totalPaid)}</b>
              <span class="trend">Disbursed by boutique</span>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon">⚖️</div>
              <small>Net Pending Balance</small>
              <b style="color:${stats.pendingBalance > 0 ? 'var(--warn)' : 'var(--ok)'}">${R(stats.pendingBalance)}</b>
              <span class="trend alert">${stats.pendingBalance > 0 ? 'Awaiting settlement' : 'Fully settled'}</span>
            </div>
          </div>

          <!-- Log Completed Work Section -->
          <div class="box">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
              <b>✂️ Record Completed Tailoring Work</b>
              <small style="color:var(--mu)">Submits piece-rate record to admin for verification &amp; wage credit</small>
            </div>
            <div class="g2" style="margin-top:8px">
              <div>
                <label>Garment Item / Craft Task</label>
                <select id="wt">
                  ${Object.keys(S.cfg.pay || {}).map(k => `
                    <option value="${Security.escapeHTML(k)}">${Security.escapeHTML(k)} (₹${S.cfg.pay[k]} / pc)</option>
                  `).join("")}
                </select>
              </div>
              <div>
                <label>Quantity of Pieces Completed</label>
                <input id="wq" type="number" value="1" min="1" max="100">
              </div>
            </div>
            <div style="margin-top:10px">
              <label>Work Note / Details (Optional)</label>
              <input id="wnote" placeholder="e.g. Completed hand embroidery on blouse for Client Farida">
            </div>
            <button class="btn p" style="margin-top:10px;width:100%" onclick="WorkerPortal.logWork()">
              ✅ Submit Completed Pieces for Admin Verification
            </button>
          </div>

          <!-- Assigned Custom Orders Queue -->
          <div class="box">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <b>📋 My Assigned Custom Stitching Orders (${myAssignedOrders.length})</b>
              <small style="color:var(--mu)">Real-time queue assigned by boutique master</small>
            </div>
            <div style="margin-top:12px;display:flex;flex-direction:column;gap:12px">
              ${myAssignedOrders.map(o => {
                const wageRate = (o.workerPendingWage || (S.cfg.pay && S.cfg.pay[o.garment]) || 150);
                const isVerified = o.workerVerified === true;
                const isPending = o.workerVerified === false || o.stage === "Master Quality Check";
                const isRework = o.workerVerified === "rework";

                return `
                <div class="box" style="margin:0;background:var(--sf2);border:1px solid ${isVerified ? 'var(--ok)' : isRework ? 'var(--bad)' : isPending ? 'var(--warn)' : 'var(--ln)'};padding:16px">
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
                    <span style="font-weight:700;font-size:1.05rem;color:var(--br)">${Security.escapeHTML(o.garment)}</span>
                    <div style="display:flex;gap:6px;align-items:center">
                      <span class="chip on" style="font-size:0.72rem;background:var(--sf);color:var(--tx);border-color:var(--ln)">Piece Rate: <b>₹${wageRate}</b></span>
                      <span class="pill ${o.status === 'Ready' ? 'ok' : 'w'}">${Security.escapeHTML(o.status)}</span>
                    </div>
                  </div>
                  <div style="margin:6px 0;font-size:0.88rem">
                    <b>Order #${Security.escapeHTML(o.no)}</b> · Client: <b>${Security.escapeHTML(o.customer)}</b> (${Security.escapeHTML(o.phone)})<br>
                    <small style="color:${o.due ? 'var(--br)' : 'var(--mu)'}">Due Date: <b>${Security.escapeHTML(o.due || "Immediate priority")}</b> · Fabric: ${Security.escapeHTML(o.fabric || "Client's Own")}</small>
                  </div>
                  <div class="meas" style="font-size:0.8rem;background:var(--sf);padding:8px;border-radius:10px;margin:8px 0">
                    ${MEAS.map(m => `
                      <div>
                        <small style="color:var(--mu)">${m}</small><br>
                        <b>${Security.escapeHTML((o.measure && o.measure[m]) || "-")}</b>
                      </div>
                    `).join("")}
                  </div>
                  ${o.note ? `<p style="font-size:0.82rem;color:var(--mu);margin:4px 0">📝 <i>${Security.escapeHTML(o.note)}</i></p>` : ""}

                  <!-- Verification Status Banner -->
                  ${isVerified ? `
                    <div class="worker-verified-banner approved" style="margin:10px 0;background:color-mix(in srgb, var(--ok) 12%, var(--sf));border:1px solid var(--ok);border-radius:10px;padding:10px 14px">
                      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
                        <span style="font-size:0.86rem;font-weight:700;color:var(--ok)">✓ Master Quality Verified</span>
                        <span class="pill ok" style="font-size:0.75rem;padding:3px 8px">+₹${o.verifiedWage || wageRate} Credited to Earnings</span>
                      </div>
                      <small style="color:var(--mu);display:block;margin-top:3px">Verified by Master on ${new Date(o.verifiedAt || o.ts).toLocaleDateString("en-IN")}. Garment ready for client delivery.</small>
                    </div>
                  ` : isRework ? `
                    <div class="worker-verified-banner rework" style="margin:10px 0;background:color-mix(in srgb, var(--bad) 12%, var(--sf));border:1.5px solid var(--bad);border-radius:10px;padding:12px 14px">
                      <b style="color:var(--bad);font-size:0.9rem">⚠️ Master Quality Check: Rework Requested</b>
                      <p style="margin:4px 0 8px;font-size:0.84rem;color:var(--tx);line-height:1.4">
                        <b>Master's Correction Note:</b> "${Security.escapeHTML(o.reworkNote || "Adjustments required before approval.")}"
                      </p>
                      <button class="btn s p" style="background:#dc2626;color:#fff" onclick="WorkerPortal.openSubmitModal('${o.id}')">
                        🔄 Rework Completed &amp; Re-Submit for Verification (+₹${wageRate})
                      </button>
                    </div>
                  ` : isPending ? `
                    <div class="worker-verified-banner pending" style="margin:10px 0;background:color-mix(in srgb, var(--warn) 14%, var(--sf));border:1px solid var(--warn);border-radius:10px;padding:10px 14px">
                      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
                        <div>
                          <b style="color:var(--warn);font-size:0.88rem">⏳ Submitted for Master Quality Verification</b>
                          <div style="font-size:0.8rem;color:var(--mu);margin-top:2px">
                            Awaiting Master inspection · Pending Wage: <b>₹${wageRate}</b>
                          </div>
                        </div>
                        <span class="pill w" style="font-size:0.75rem">Under Master Review</span>
                      </div>
                    </div>
                  ` : ""}

                  <div style="margin-top:10px;background:var(--sf);padding:10px 12px;border-radius:10px;border:1px solid var(--ln)">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                      <b style="font-size:0.82rem;color:var(--br)">✂️ Current Crafting Stage:</b>
                      <span class="pill ok" style="font-size:0.72rem">${Security.escapeHTML(o.stage || "Cutting & Pattern Drafting")}</span>
                    </div>
                    <select onchange="WorkerPortal.updateStage('${o.id}', this.value)" style="margin:0;padding:6px 10px;font-size:0.84rem;border-radius:8px;font-weight:600">
                      ${WORK_PROGRESS_STAGES.map(st => `<option value="${Security.escapeHTML(st)}" ${o.stage === st ? "selected" : ""}>${Security.escapeHTML(st)}</option>`).join("")}
                    </select>

                    <div style="margin-top:8px;display:flex;gap:3px">
                      ${WORK_PROGRESS_STAGES.map((st, sIdx) => {
                        const curStageIdx = WORK_PROGRESS_STAGES.indexOf(o.stage || "Cutting & Pattern Drafting");
                        const isDone = sIdx <= curStageIdx;
                        return `<div style="flex:1;height:4px;border-radius:2px;background:${isDone ? 'var(--br)' : 'var(--ln)'}" title="${Security.escapeHTML(st)}"></div>`;
                      }).join("")}
                    </div>
                  </div>

                  <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
                    ${!isVerified && !isPending ? `
                      <button class="btn s p" style="flex:2;background:linear-gradient(135deg,var(--br),var(--br2))" onclick="WorkerPortal.openSubmitModal('${o.id}')">
                        ✨ Complete Work &amp; Submit for Master Verification (+₹${wageRate})
                      </button>
                    ` : ""}
                    <button class="btn s" style="flex:1" onclick="printInvoice('${o.id}')">
                      🧾 View Stitching Spec Sheet
                    </button>
                  </div>
                </div>
                `;
              }).join("") || `<p style="color:var(--mu);text-align:center;padding:16px 0">No pending orders assigned to you right now. Great job! 👏</p>`}
            </div>
          </div>

          <!-- Work History Log -->
          <div class="box">
            <b>📜 My Recent Completed Work Log</b>
            <div style="overflow-x:auto;margin-top:10px">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Garment Task</th>
                    <th>Pieces</th>
                    <th>Rate</th>
                    <th>Total Earned</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${myWork.slice().sort((a, b) => b.ts - a.ts).slice(0, 15).map(w => `
                    <tr>
                      <td>${new Date(w.ts).toLocaleDateString("en-IN")}<br><small style="color:var(--mu)">${new Date(w.ts).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}</small></td>
                      <td><b>${Security.escapeHTML(w.task)}</b>${w.note ? `<br><small style="color:var(--mu)">${Security.escapeHTML(w.note)}</small>` : ""}</td>
                      <td><b>${w.qty}</b> pcs</td>
                      <td>₹${w.rate || 0}</td>
                      <td><b style="color:var(--ok)">${R(w.qty * (w.rate || 0))}</b></td>
                      <td>
                        ${w.verified !== false ? `
                          <span class="pill ok" style="font-size:0.72rem;padding:2px 8px">✓ Verified &amp; Added</span>
                        ` : `
                          <span class="pill w" style="font-size:0.72rem;padding:2px 8px">⏳ Pending Admin Check</span>
                        `}
                      </td>
                    </tr>
                  `).join("") || `<tr><td colspan="6" style="text-align:center;color:var(--mu);padding:16px">No work entries logged yet this month.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    `;

    $("pn").classList.add("on");
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  updateStage(orderId, stageName) {
    if (typeof updateOrderProgressStage === "function") {
      updateOrderProgressStage(orderId, stageName, `Stage updated to ${stageName} by Artisan in Worker Portal`);
    } else {
      upd("orders", orderId, { stage: stageName });
    }
    if (stageName === "Ready for Trial & Delivery") {
      upd("orders", orderId, { status: "Ready" });
    }
    toast(`Task stage updated to '${stageName}' 🧵`);
    this.showPanel();
  },

  openSubmitModal(orderId) {
    const o = orders().find(x => x.id == orderId);
    if (!o) return toast("Order not found");
    const wageRate = (o.workerPendingWage || (S.cfg.pay && S.cfg.pay[o.garment]) || 150);

    modal(`
      <div style="text-align:center;padding:12px 6px">
        <div style="font-size:2.4rem;margin-bottom:8px">🧵✨</div>
        <h2 style="color:var(--br);margin:0 0 8px">Submit Work for Master Quality Verification</h2>
        <p style="color:var(--mu);font-size:0.9rem;margin-bottom:14px;line-height:1.4">
          Garment <b>"${Security.escapeHTML(o.garment)}"</b> for Order <b>#${Security.escapeHTML(o.no)}</b> (${Security.escapeHTML(o.customer)}) will be submitted to the Boutique Master for quality check.
        </p>

        <div style="background:var(--sf2);border:1px solid var(--ln);border-radius:12px;padding:12px 14px;margin-bottom:16px;text-align:left">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:0.85rem;color:var(--mu)">Craft Piece Wage:</span>
            <b style="font-size:1.15rem;color:var(--ok)">+₹${wageRate}</b>
          </div>
          <small style="color:var(--mu);line-height:1.4;display:block">
            ℹ️ Once the Boutique Master verifies stitching quality and fit, this ₹${wageRate} will be credited to your verified monthly earnings in real-time.
          </small>
        </div>

        <div style="text-align:left;margin-bottom:16px">
          <label style="font-size:0.84rem">Artisan Completion Note (Optional)</label>
          <input id="worker_submit_note" placeholder="e.g. Finished neck piping, latkans attached, ready for trial" value="${Security.escapeHTML(o.workerNote || '')}">
        </div>

        <div style="display:flex;gap:10px">
          <button class="btn" style="flex:1" onclick="closeM()">Cancel</button>
          <button class="btn p" style="flex:2;background:linear-gradient(135deg,var(--br),var(--br2))" onclick="WorkerPortal.submitOrderForVerification('${o.id}')">
            ✅ Submit for Verification (+₹${wageRate})
          </button>
        </div>
      </div>
    `);
  },

  submitOrderForVerification(orderId) {
    const o = orders().find(x => x.id == orderId);
    if (!o) return toast("Order not found");
    const m = S.me;
    if (!m) return toast("Please login");

    const noteInput = $("worker_submit_note");
    const note = noteInput ? noteInput.value.trim() : (o.workerNote || "");
    const wageRate = (o.workerPendingWage || (S.cfg.pay && S.cfg.pay[o.garment]) || 150);

    closeM();

    upd("orders", orderId, {
      stage: "Master Quality Check",
      workerVerified: false,
      workerPendingWage: wageRate,
      workerSubmittedAt: Date.now(),
      workerNote: note
    }).then(() => {
      Realtime.broadcast("ORDER_SUBMITTED_FOR_VERIFICATION", {
        orderId,
        orderNo: o.no,
        workerId: m.id,
        workerName: m.name,
        garment: o.garment,
        wage: wageRate
      });
      toast(`Order #${o.no} submitted for Master Quality Verification! Pending wage: ₹${wageRate} 🧵`);
      this.showPanel();
    });
  },

  logWork() {
    const taskName = $("wt").value;
    const q = Math.max(1, parseInt($("wq").value, 10) || 1);
    const note = ($("wnote") ? $("wnote").value.trim() : "");
    const m = S.me;

    if (!m || !m.id) return toast("Worker session invalid. Please log in again.");
    if (q < 1) return toast("Enter valid quantity of pieces");

    const rate = S.cfg.pay[taskName] || 0;

    put("work", {
      wk: m.id,
      wn: m.name,
      task: taskName,
      qty: q,
      rate: rate,
      note: note,
      verified: false,
      ts: Date.now()
    }).then(id => {
      if (id) {
        Realtime.broadcast("WORK_LOGGED", {
          workerId: m.id,
          workerName: m.name,
          task: taskName,
          qty: q,
          total: q * rate,
          verified: false
        });
        toast(`Logged ${q} pc of ${taskName} (₹${q * rate}) — submitted to Master for verification ⏳`);
        this.showPanel();
      }
    });
  },

  markOrderReady(orderId) {
    this.openSubmitModal(orderId);
  }
};

// Global aliases
function wpanel() {
  WorkerPortal.render();
}

function logW() {
  WorkerPortal.logWork();
}
