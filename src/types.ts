type Tail<T extends any[]> = T extends [head: any, ...tail: infer Tail_] ? Tail_ : never

export type { Tail }
