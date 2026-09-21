import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoundScheduler } from './collection-ui.js';

afterEach(()=>vi.useRealTimers());

describe('collection round callback lifecycle',()=>{
  it('cancels an abandoned clear before it can grant a reward in a new round',()=>{
    vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']});
    const timers=createRoundScheduler(),award=vi.fn(),nextRound=vi.fn();
    timers.schedule(award,650);
    vi.advanceTimersByTime(300);
    timers.clear();
    timers.schedule(nextRound,1250);
    vi.advanceTimersByTime(1000);
    expect(award).not.toHaveBeenCalled();
    expect(nextRound).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(nextRound).toHaveBeenCalledTimes(1);
  });

  it('preserves reveal timing across a long background interruption',()=>{
    vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']});
    const timers=createRoundScheduler(),cue=vi.fn(),actions=vi.fn();
    timers.schedule(cue,2640);timers.schedule(actions,3670);
    vi.advanceTimersByTime(1400);timers.pause();
    vi.advanceTimersByTime(60000);
    expect(cue).not.toHaveBeenCalled();expect(actions).not.toHaveBeenCalled();
    timers.resume();timers.resume();
    vi.advanceTimersByTime(1239);expect(cue).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);expect(cue).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1030);expect(actions).toHaveBeenCalledTimes(1);
  });

  it('discards paused tasks on close and keeps later work suspended until resume',()=>{
    vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']});
    const timers=createRoundScheduler(),abandoned=vi.fn(),later=vi.fn();
    timers.schedule(abandoned,650);timers.pause();timers.clear();
    timers.schedule(later,220);vi.advanceTimersByTime(1000);
    expect(later).not.toHaveBeenCalled();
    timers.resume();vi.advanceTimersByTime(220);
    expect(abandoned).not.toHaveBeenCalled();expect(later).toHaveBeenCalledTimes(1);
  });
});
