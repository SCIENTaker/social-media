import { useEffect, useId, useState } from 'react';
import { db } from '../lib/store';
import type { Person } from '../lib/types';
import { Avatar } from './common';
import { KIND_LABELS } from '../lib/labels';

interface Props {
  placeholder?: string;
  onSelect: (p: Person) => void;
  /** 選択後に入力欄へ表示する名前(人物選択に使う場合) */
  value?: Person;
  autoFocus?: boolean;
  label?: string;
}

/** 名前・読み・旧名で人物を検索するコンボボックス */
export function SearchBox({ placeholder = '名前・読み・旧名で検索', onSelect, value, autoFocus, label }: Props) {
  const [q, setQ] = useState(value?.name ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  // URL の変更などで選択中の人物が外から変わったら表示を合わせる
  useEffect(() => {
    if (value) setQ(value.name);
  }, [value]);
  const results = open ? db.search(q, 8) : [];

  const choose = (p: Person) => {
    onSelect(p);
    setQ(value !== undefined || label ? p.name : '');
    setOpen(false);
  };

  return (
    <div className="search">
      {label && <label className="search-label">{label}</label>}
      <input
        type="search"
        value={q}
        placeholder={placeholder}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        aria-label={label ?? placeholder}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault();
            choose(results[active]);
          } else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {results.length > 0 && (
        <ul className="search-results" id={listId} role="listbox">
          {results.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <Avatar person={p} size={26} />
              <span className="sr-name">{p.name}</span>
              <span className="muted small">
                {p.kana}
                {p.aliases.length > 0 && ` / 旧: ${p.aliases.join('、')}`}
              </span>
              <span className="badge small">{KIND_LABELS[p.kind]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
