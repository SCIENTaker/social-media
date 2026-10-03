import { dataset } from '../src/data';
import { validateDataset } from '../src/lib/validate';

const errors = validateDataset(dataset);
if (errors.length) {
  console.error(`データに ${errors.length} 件の問題があります:`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(
  `データ OK: 人物 ${dataset.persons.length} / 組織 ${dataset.orgs.length} / イベント ${dataset.events.length} / 関係 ${dataset.relations.length} / 出典 ${dataset.sources.length}`,
);
