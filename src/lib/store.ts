import { dataset } from '../data';
import { Db } from './db';

export const db = new Db(dataset);
