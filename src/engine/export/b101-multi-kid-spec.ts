/**
 * B101 multi-kid checkbox spec: one-time mapping from canonical value → kid index + raw PDF key.
 * From scripts/inspect-b101-multikid.mjs (template has Check Box1 = chapter 7/11/12/13, same for header + Q7).
 */
export const B101_MULTI_KID_SPEC: Record<
    string,
    { kidCount: number; options: { value: string; kidIndex: number; rawKey: string; kidIndices?: number[] }[] }
> = {
    /** Chapter (header + Part 2 Q7): 8 kids — 0–3 = header, 4–7 = Q7; set both for same chapter. */
    'Check Box1': {
        kidCount: 8,
        options: [
            { value: '7', kidIndex: 0, rawKey: 'Chapter#207', kidIndices: [0, 4] },
            { value: '11', kidIndex: 1, rawKey: 'Chapter#2011', kidIndices: [1, 5] },
            { value: '12', kidIndex: 2, rawKey: 'Chapter#2012', kidIndices: [2, 6] },
            { value: '13', kidIndex: 3, rawKey: 'Chapter#2013', kidIndices: [3, 7] },
        ],
    },
    'Check Box7': {
        kidCount: 3,
        options: [
            { value: 'Pay entirely', kidIndex: 0, rawKey: 'Pay#20entirely' },
            { value: 'Pay in installments', kidIndex: 1, rawKey: 'Pay#20in#20installments' },
            { value: 'Request fees waived', kidIndex: 2, rawKey: 'Request#20fees#20waived' },
        ],
    },
    'Check Box20': {
        kidCount: 2,
        options: [
            { value: 'No', kidIndex: 0, rawKey: 'No' },
            { value: 'Yes', kidIndex: 1, rawKey: 'Yes' },
        ],
    },
    'Check Box22': {
        kidCount: 12,
        options: [{ value: '500001-1000000', kidIndex: 9, rawKey: '500001-1000000' }],
    },
    'Check Box23': {
        kidCount: 12,
        options: [{ value: '500001-1000000', kidIndex: 9, rawKey: '500001-1000000' }],
    },
    /** Q13: Not filing under Ch11 / Ch11 not small business / Yes small business etc. */
    'Check Box14': {
        kidCount: 4,
        options: [
            { value: 'Not filing under Chapter 11', kidIndex: 0, rawKey: 'Not#20filing#20under#20Chapter#2011' },
            { value: 'Filing under Chapter 11 but not small business', kidIndex: 1, rawKey: 'Filing#20under#20Chapter#2011#20but#20not#20small#20business' },
            { value: 'Yes filling under chapter', kidIndex: 2, rawKey: 'Yes#20filling#20under#20chapter' },
            { value: 'Yes filing under Chapter 11 but not small business', kidIndex: 3, rawKey: 'Yes#20filing#20under#20Chapter#2011#20but#20not#20small#20business' },
        ],
    },
    /** Awareness: serious consequences (24), fraud awareness (25), paid non-attorney (26). */
    'Check Box24': { kidCount: 2, options: [{ value: 'Yes', kidIndex: 1, rawKey: 'Yes' }, { value: 'No', kidIndex: 0, rawKey: 'No' }] },
    'Check Box25': { kidCount: 2, options: [{ value: 'Yes', kidIndex: 1, rawKey: 'Yes' }, { value: 'No', kidIndex: 0, rawKey: 'no' }] },
    'Check Box26': { kidCount: 2, options: [{ value: 'Yes', kidIndex: 1, rawKey: 'Yes' }, { value: 'No', kidIndex: 0, rawKey: 'no' }] },
};
