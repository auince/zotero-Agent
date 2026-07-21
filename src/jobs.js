/* global Zotero */

var ResearchAgentJobs = {
  active: null,

  start(label, targets, worker, onProgress = () => {}) {
    if (this.active) throw new Error(`Indexing is already running: ${this.active.label}`);
    const job = { id: `${Date.now()}-${Math.random()}`, label, total: targets.length, completed: 0, cancelled: false, errors: [] };
    job.promise = this.run(job, targets, worker, onProgress);
    this.active = job;
    return job;
  },

  cancel() {
    if (this.active) this.active.cancelled = true;
  },

  async run(job, targets, worker, onProgress) {
    try {
      onProgress({ ...job, state: "running" });
      for (const target of targets) {
        if (job.cancelled) break;
        try {
          await worker(target);
        } catch (error) {
          Zotero.logError(error);
          job.errors.push({ key: target.item?.key, message: error.message });
        }
        job.completed++;
        onProgress({ ...job, state: job.cancelled ? "cancelling" : "running" });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      return { ...job, state: job.cancelled ? "cancelled" : "completed" };
    } finally {
      if (this.active?.id === job.id) this.active = null;
    }
  }
};
