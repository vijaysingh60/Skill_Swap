process.env.JWT_SECRET = 'test-secret';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeMatch, recommend } from '../src/utils/matching.js';

const s = (...names) => names.map((name) => ({ name, level: 'beginner' }));
const student = (name, offered, wanted) => ({ name, skillsOffered: s(...offered), skillsWanted: s(...wanted) });

describe('computeMatch', () => {
  const me = student('Me', ['Python', 'Chess'], ['Guitar', 'Design']);

  it('finds skills they can teach me and skills I can teach them', () => {
    const m = computeMatch(me, student('A', ['Guitar'], ['Chess']));
    assert.deepEqual(m.theyCanTeachMe, ['Guitar']);
    assert.deepEqual(m.iCanTeachThem, ['Chess']);
    assert.equal(m.mutual, true);
  });

  it('is case- and whitespace-insensitive', () => {
    const m = computeMatch(me, student('A', ['  guitar '], []));
    assert.deepEqual(m.theyCanTeachMe, ['  guitar ']);
  });

  it('scores a mutual match above a one-way match, and more overlap above less', () => {
    const mutual = computeMatch(me, student('A', ['Guitar'], ['Python'])).score;
    const oneWay = computeMatch(me, student('B', ['Guitar'], [])).score;
    const twoSkillsOneWay = computeMatch(me, student('C', ['Guitar', 'Design'], [])).score;
    assert.ok(mutual > oneWay);
    assert.ok(twoSkillsOneWay > oneWay);
  });

  it('scores zero when nothing overlaps', () => {
    const m = computeMatch(me, student('A', ['Cooking'], ['Dancing']));
    assert.equal(m.score, 0);
    assert.equal(m.mutual, false);
  });
});

describe('recommend', () => {
  const me = student('Me', ['Python'], ['Guitar', 'Design']);
  const others = [
    student('Zed', ['Guitar'], []), // one-way
    student('Amy', ['Guitar'], ['Python']), // mutual
    student('Bob', ['Cooking'], ['Python']), // they want my skill but teach nothing I want -> excluded
    student('Cat', ['Guitar', 'Design'], []), // two skills, one-way
  ];

  it('only recommends students who teach something I want to learn', () => {
    const names = recommend(me, others, 10).map((r) => r.user.name);
    assert.ok(!names.includes('Bob'));
  });

  it('puts complementary (mutual) students first, then by overlap', () => {
    const names = recommend(me, others, 10).map((r) => r.user.name);
    assert.deepEqual(names, ['Amy', 'Cat', 'Zed']);
  });

  it('respects the limit', () => {
    assert.equal(recommend(me, others, 2).length, 2);
  });
});
