import persons from './persons.json';
import orgs from './orgs.json';
import memberships from './memberships.json';
import relations from './relations.json';
import events from './events.json';
import sources from './sources.json';
import changes from './changes.json';
import type { Dataset } from '../lib/types';

export const dataset = {
  persons,
  orgs,
  memberships,
  relations,
  events,
  sources,
  changes,
} as Dataset;
