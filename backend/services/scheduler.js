/**
 * scheduler.js — the "Scheduler" tool.
 *
 * Allocates topics across the number of days available before the exam,
 * weighting by difficulty and (on re-plan) by how weak the student's
 * mastery score is for that topic. This is what makes the planner
 * "adaptive": build() is called once on Day 1, replan() is called after
 * every quiz submission.
 */
const DIFFICULTY_HOURS = { easy: 0.75, medium: 1.5, hard: 2.5 };

function estimatedHours(topic) {
  return DIFFICULTY_HOURS[topic.difficulty] || 1.5;
}

/**
 * @param {Array} topics - [{id, title, difficulty}]
 * @param {number} days
 * @param {number} hoursPerDay
 * @param {Object} masteryByTopicId - optional {topicId: 0..1}
 */
function build(topics, days, hoursPerDay, masteryByTopicId = {}) {
  // weight = base difficulty hours, boosted for low-mastery topics
  const weighted = topics.map(t => {
    const mastery = masteryByTopicId[t.id] ?? 0;
    const weight = estimatedHours(t) * (1 + (1 - mastery)); // weaker topics get more time
    return { ...t, weight };
  });

  const schedule = Array.from({ length: days }, (_, i) => ({ day: i + 1, items: [], totalHours: 0 }));

  // Greedy bin-packing: always add the next topic-chunk to the day with the least hours so far,
  // splitting a topic across days if it doesn't fit in one day.
  const queue = weighted.map(t => ({ ...t, remaining: Math.min(t.weight, hoursPerDay * 1.5) }));

  for (const item of queue) {
    let remaining = item.remaining;
    while (remaining > 0.01) {
      const day = schedule.reduce((min, d) => (d.totalHours < min.totalHours ? d : min), schedule[0]);
      const capacity = hoursPerDay - day.totalHours;
      if (capacity <= 0.05) {
        // all days effectively full; dump remainder on the lightest day anyway
        day.items.push({ topicId: item.id, title: item.title, hours: +remaining.toFixed(2) });
        day.totalHours += remaining;
        remaining = 0;
        break;
      }
      const chunk = Math.min(capacity, remaining);
      day.items.push({ topicId: item.id, title: item.title, hours: +chunk.toFixed(2) });
      day.totalHours += chunk;
      remaining -= chunk;
    }
  }

  schedule.forEach(d => (d.totalHours = +d.totalHours.toFixed(2)));
  return schedule;
}

/**
 * Re-plan the remaining (not-yet-completed) days based on updated mastery scores,
 * per the report's "feedback loop": weaker topics get pushed earlier / given more time.
 */
function replan(topics, remainingDays, hoursPerDay, masteryByTopicId) {
  // Sort weakest-first so they land on earlier remaining days.
  const sorted = [...topics].sort((a, b) => (masteryByTopicId[a.id] ?? 0) - (masteryByTopicId[b.id] ?? 0));
  return build(sorted, remainingDays, hoursPerDay, masteryByTopicId);
}

module.exports = { build, replan, estimatedHours };
