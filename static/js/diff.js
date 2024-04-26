
function _calculate_ratio(matches, length) {
	if (length) return 2.0 * matches / length;
	return 1.0;
}

class SequenceMatcher {
	constructor(isjunk, a="", b="", autojunk=true) {
		this.isjunk = isjunk;
		this.a = this.b = null;
		this.autojunk = autojunk;
		this.set_seqs(a, b);
	}

	set_seqs(a, b) {
		this.set_seq1(a);
		this.set_seq2(b);
	}

	set_seq1(a) {
		if (a === this.a) return;
		this.a = a;
		this.matching_blocks = this.opcodes = null;
	}

	set_seq2(b) {
		if (b === this.b) return;
		this.b = b;
		this.matching_blocks = this.opcodes = null;
		this.fullbcount = null;
		this.__chain_b();
	}

	__chain_b() {
		let b = this.b;
		let b2j = {};
		this.b2j = b2j;

		let indices;
		for (const [i, elt] of (typeof b === "string" ? b.split('') : b).entries()) {
			indices = b2j[elt];
			if (indices === undefined) {
				indices = b2j[elt] = [];
			}
			indices.push(i);
		}

		// Purge junk elements
		let junk = new Set();
		this.bjunk = junk;
		let isjunk = this.isjunk;
		if (isjunk) {
			for (const elt in b2j) {
				if (isjunk(elt)) {
					junk.add(elt);
				}
			}
			for (const elt of junk) { // separate loop avoids separate list of keys
				delete b2j[elt];
			}
		}

		// Purge popular elements that are not junk
		let popular = new Set();
		this.bpopular = popular;
		let n = b.length;
		if (this.autojunk && n >= 200) {
			let ntest = Math.floor(n / 100) + 1;
			for (const elt in b2j) {
				if (b2j[elt].length > ntest) {
					popular.add(elt);
				}
			}
			for (const elt of popular) { // ditto; as fast for 1% deletion
				delete b2j[elt];
			}
		}
	}

	find_longest_match(alo=0, ahi=null, blo=0, bhi=null) {
		let a = this.a;
		let b = this.b;
		let b2j = this.b2j;
		if (ahi === null) ahi = a.length;
		if (bhi === null) bhi = b.length;
		let besti = alo;
		let bestj = blo;
		let bestsize = 0;
		// find longest junk-free match
		// during an iteration of the loop, j2len[j] = length of longest
		// junk-free match ending with a[i-1] and b[j]
		let j2len = {};
		let nothing = [];
		for (let i = alo; i < ahi; i++) {
			// look at all instances of a[i] in b; note that because
			// b2j has no junk keys, the loop is skipped if a[i] is junk
			let j2lenget = (key, fallback) => j2len[key] || fallback;
			let newj2len = {};
			for (let j of (b2j[a[i]] || nothing)) {
				// a[i] matches b[j]
				if (j < blo) continue;
				if (j >= bhi) break;
				let k = newj2len[j] = j2lenget(j-1, 0) + 1;
				if (k > bestsize) {
					besti = i-k+1;
					bestj = j-k+1;
					bestsize = k;
				}
			}
			j2len = newj2len;
		}

		// Extend the best by non-junk elements on each end.  In particular,
		// "popular" non-junk elements aren't in b2j, which greatly speeds
		// the inner loop above, but also means "the best" match so far
		// doesn't contain any junk *or* popular non-junk elements.
		while (besti > alo && bestj > blo &&
			  !this.bjunk.has(b[bestj-1]) &&
			  a[besti-1] == b[bestj-1]) {
			besti--;
			bestj--;
			bestsize++;
		}
		while (besti+bestsize < ahi && bestj+bestsize < bhi &&
			  !this.bjunk.has(b[bestj+bestsize]) &&
			  a[besti+bestsize] == b[bestj+bestsize]) {
			bestsize++;
		}

		// Now that we have a wholly interesting match (albeit possibly
		// empty!), we may as well suck up the matching junk on each
		// side of it too.  Can't think of a good reason not to, and it
		// saves post-processing the (possibly considerable) expense of
		// figuring out what to do with it.  In the case of an empty
		// interesting match, this is clearly the right thing to do,
		// because no other kind of match is possible in the regions.
		while (besti > alo && bestj > blo &&
			  this.bjunk.has(b[bestj-1]) &&
			  a[besti-1] == b[bestj-1]) {
			besti--;
			bestj--;
			bestsize++;
		}
		while (besti+bestsize < ahi && bestj+bestsize < bhi &&
			  this.bjunk.has(b[bestj+bestsize]) &&
			  a[besti+bestsize] == b[bestj+bestsize]) {
			bestsize++;
		}

		return [besti, bestj, bestsize];
		//return Match(besti, bestj, bestsize);
	}

	get_matching_blocks() {
		if (this.matching_blocks !== null) return this.matching_blocks;
		let la = this.a.length;
		let lb = this.b.length;

		// This is most naturally expressed as a recursive algorithm, but
		// at least one user bumped into extreme use cases that exceeded
		// the recursion limit on their box.  So, now we maintain a list
		// ('queue`) of blocks we still need to look at, and append partial
		// results to `matching_blocks` in a loop; the matches are sorted
		// at the end.
		let queue = [[0, la, 0, lb]];
		let matching_blocks = [];
		while (queue.length) {
			let [alo, ahi, blo, bhi] = queue.pop();
			let x = this.find_longest_match(alo, ahi, blo, bhi);
			let [i, j, k] = x;
			// a[alo:i] vs b[blo:j] unknown
			// a[i:i+k] same as b[j:j+k]
			// a[i+k:ahi] vs b[j+k:bhi] unknown
			if (k) { // if k is 0, there was no matching block
				matching_blocks.push(x);
				if (alo < i && blo < j) {
					queue.push([alo, i, blo, j]);
				}
				if (i+k < ahi && j+k < bhi) {
					queue.push([i+k, ahi, j+k, bhi]);
				}
			}
		}
		matching_blocks.sort((a, b) => a[0] - b[0]);

		// It's possible that we have adjacent equal blocks in the
		// matching_blocks list now.  Starting with 2.5, this code was added
		// to collapse them.
		let i1, j1, k1;
		i1 = j1 = k1 = 0;
		let non_adjacent = [];
		for (let [i2, j2, k2] of matching_blocks) {
			// Is this block adjacent to i1, j1, k1?
			if (i1 + k1 == i2 && j1 + k1 == j2) {
				// Yes, so collapse them -- this just increases the length of
				// the first block by the length of the second, and the first
				// block so lengthened remains the block to compare against.
				k1 += k2;
			} else {
				// Not adjacent.  Remember the first block (k1==0 means it's
				// the dummy we started with), and make the second block the
				// new block to compare against.
				if (k1) {
					non_adjacent.push([i1, j1, k1]);
				}
				[i1, j1, k1] = [i2, j2, k2];
			}
		}
		if (k1) {
			non_adjacent.push([i1, j1, k1]);
		}

		non_adjacent.push( [la, lb, 0] );
		this.matching_blocks = non_adjacent;
		//this.matching_blocks = non_adjacent.map(Match._make);
		return this.matching_blocks;
	}

	get_opcodes() {
		if (this.opcodes !== null) return this.opcodes;
		let i, j;
		i = j = 0;
		let answer = [];
		this.opcodes = answer;
		for (let [ai, bj, size] of this.get_matching_blocks()) {
			// invariant:  we've pumped out correct diffs to change
			// a[:i] into b[:j], and the next matching block is
			// a[ai:ai+size] == b[bj:bj+size].  So we need to pump
			// out a diff to change a[i:ai] into b[j:bj], pump out
			// the matching block, and move (i,j) beyond the match
			let tag = '';
			if (i < ai && j < bj) {
				tag = 'replace';
			} else if (i < ai) {
				tag = 'delete';
			} else if (j < bj) {
				tag = 'insert';
			}
			if (tag) {
				answer.push( [tag, i, ai, j, bj] );
			}
			[i, j] = [ai+size, bj+size];
			// the list of matching blocks is terminated by a
			// sentinel with size 0
			if (size) {
				answer.push( ['equal', ai, i, bj, j] );
			}
		}
		return answer;
	}

	* get_grouped_opcodes(n=3) {
		let codes = this.get_opcodes();
		if (!codes) {
			codes = [["equal", 0, 1, 0, 1]];
		}
		// Fixup leading and trailing groups if they show no changes.
		if (codes[0][0] == 'equal') {
			let [tag, i1, i2, j1, j2] = codes[0];
			codes[0] = [tag, Math.max(i1, i2-n), i2, Math.max(j1, j2-n), j2];
		}
		if (codes[codes.length-1][0] == 'equal') {
			let [tag, i1, i2, j1, j2] = codes[codes.length-1];
			codes[codes.length-1] = [tag, i1, Math.min(i2, i1+n), j1, Math.min(j2, j1+n)];
		}

		let nn = n + n;
		let group = [];
		for (let [tag, i1, i2, j1, j2] of codes) {
			// End the current group and start a new one whenever
			// there is a large range with no changes.
			if (tag == 'equal' && i2-i1 > nn) {
				group.push([tag, i1, Math.min(i2, i1+n), j1, Math.min(j2, j1+n)]);
				yield group;
				group = [];
				[i1, j1] = [Math.max(i1, i2-n), Math.max(j1, j2-n)];
			}
			group.push([tag, i1, i2, j1 ,j2]);
		}
		if (group && !(group.length==1 && group[0][0] == 'equal')) {
			yield group;
		}
	}

	ratio() {
		let matches = this.get_matching_blocks().reduce((acc, triple) => acc + triple[triple.length-1], 0);
		return _calculate_ratio(matches, this.a.length + this.b.length);
	}

	quick_ratio() {
		// viewing a and b as multisets, set matches to the cardinality
		// of their intersection; this counts the number of matches
		// without regard to order, so is clearly an upper bound
		let fullbcount;
		if (this.fullbcount === null) {
			fullbcount = {};
			this.fullbcount = fullbcount
			for (let elt of this.b) {
				fullbcount[elt] = (fullbcount[elt] || 0) + 1;
			}
		}
		fullbcount = this.fullbcount;
		// avail[x] is the number of times x appears in 'b' less the
		// number of times we've seen it in 'a' so far ... kinda
		let avail = new Set();
		let matches = 0;
		for (let elt of this.a) {
			let numb;
			if (avail.has(elt)) {
				numb = avail[elt];
			} else {
				numb = fullbcount[elt] || 0;
			}
			avail[elt] = numb - 1;
			if (numb > 0) matches++;
		}
		return _calculate_ratio(matches, this.a.length + this.b.length);
	}

	real_quick_ratio() {
		let la = this.a.length;
		let lb = this.b.length;
		// can't have more matches than the number of elements in the
		// shorter sequence
		return _calculate_ratio(Math.min(la, lb), la + lb);
	}

	//__class_getitem__ = classmethod(GenericAlias)
}

class Differ {
	constructor(linejunk, charjunk) {
		this.linejunk = linejunk;
		this.charjunk = charjunk;
	}

	* compare(a, b) {
		const cruncher = new SequenceMatcher(this.linejunk, a, b);
		for (let [tag, alo, ahi, blo, bhi] of cruncher.get_opcodes()) {
			let g;
			if (tag == 'replace')
				g = this._fancy_replace(a, alo, ahi, b, blo, bhi);
			else if (tag == 'delete')
				g = this._dump('-', a, alo, ahi);
			else if (tag == 'insert')
				g = this._dump('+', b, blo, bhi);
			else if (tag == 'equal')
				g = this._dump(' ', a, alo, ahi);
			else
				throw new Error(`unknown tag tag`);

			yield* g;
		}
	}

	* _dump(tag, x, lo, hi) {
		for (let i = lo; i < hi; i++) {
			yield `${tag} ${x[i]}`;
		}
	}

	* _plain_replace(a, alo, ahi, b, blo, bhi) {
		if (!(alo < ahi && blo < bhi)) throw new Error('assertion failed');
		// dump the shorter block first -- reduces the burden on short-term
		// memory if the blocks are of very different sizes
		if (bhi - blo < ahi - alo) {
			first  = this._dump('+', b, blo, bhi);
			second = this._dump('-', a, alo, ahi);
		} else {
			first  = this._dump('-', a, alo, ahi);
			second = this._dump('+', b, blo, bhi);
		}

		yield* first;
		yield* second;
	}

	* _fancy_replace(a, alo, ahi, b, blo, bhi) {
		// don't synch up unless the lines have a similarity score of at
		// least cutoff; best_ratio tracks the best score seen so far
		let best_ratio = 0.74;
		let cutoff = 0.75;
		let cruncher = new SequenceMatcher(this.charjunk);
		let eqi, eqj = null; // 1st indices of equal lines (if any)
		let best_i, best_j = null;

		// search for the pair that matches best without being identical
		// (identical lines must be junk lines, & we don't want to synch up
		// on junk -- unless we have to)
		for (let j = blo; j < bhi; j++) {
			let bj = b[j];
			cruncher.set_seq2(bj);
			for (let i = alo; i < ahi; i++) {
				let ai = a[i];
				if (ai == bj) {
					if (eqi === null) {
						eqi = i;
						eqj = j;
					}
					continue;
				}
				cruncher.set_seq1(ai);
				// computing similarity is expensive, so use the quick
				// upper bounds first -- have seen this speed up messy
				// compares by a factor of 3.
				// note that ratio() is only expensive to compute the first
				// time it's called on a sequence pair; the expensive part
				// of the computation is cached by cruncher
				if (cruncher.real_quick_ratio() > best_ratio &&
					cruncher.quick_ratio() > best_ratio &&
					cruncher.ratio() > best_ratio) {
					best_ratio = cruncher.ratio();
					best_i = i;
					best_j = j;
				}
			}
		}
		if (best_ratio < cutoff) {
			// no non-identical "pretty close" pair
			if (eqi === null) {
				// no identical pair either -- treat it as a straight replace
				yield* this._plain_replace(a, alo, ahi, b, blo, bhi);
				return;
			}
			// no close pair, but an identical pair -- synch up on that
			best_i = eqi;
			best_j = eqj;
			best_ratio = 1.0;
		} else {
			// there's a close pair, so forget the identical pair (if any)
			eqi = null;
		}

		// a[best_i] very similar to b[best_j]; eqi is None iff they're not
		// identical

		// pump out diffs from before the synch point
		yield* this._fancy_helper(a, alo, best_i, b, blo, best_j);

		// do intraline marking on the synch pair
		let aelt = a[best_i];
		let belt = b[best_j];
		if (eqi === null) {
			// pump out a '-', '?', '+', '?' quad for the synched lines
			let atags = "";
			let btags = "";
			cruncher.set_seqs(aelt, belt);
			for (let [tag, ai1, ai2, bj1, bj2] of cruncher.get_opcodes()) {
				let la = ai2 - ai1;
				let lb = bj2 - bj1;
				if (tag == 'replace') {
					atags += '^'.repeat(la);
					btags += '^'.repeat(lb);
				} else if (tag == 'delete') {
					atags += '-'.repeat(la);
				} else if (tag == 'insert') {
					btags += '+'.repeat(lb);
				} else if (tag == 'equal') {
					atags += ' '.repeat(la);
					btags += ' '.repeat(lb);
				} else {
					throw Error(`unknown tag ${tag}`);
				}
			}
			yield* this._qformat(aelt, belt, atags, btags);
		} else {
			// the synch pair is identical
			yield '  ' + aelt;
		}

		// pump out diffs from after the synch point
		yield* this._fancy_helper(a, best_i+1, ahi, b, best_j+1, bhi);
	}

	* _fancy_helper(a, alo, ahi, b, blo, bhi) {
		let g = [];
		if (alo < ahi) {
			if (blo < bhi) {
				g = this._fancy_replace(a, alo, ahi, b, blo, bhi);
			} else {
				g = this._dump('-', a, alo, ahi);
			}
		} else if (blo < bhi) {
			g = this._dump('+', b, blo, bhi)
		}

		yield* g
	}

	* _qformat(aline, bline, atags, btags) {
		atags = _keep_original_ws(aline, atags).trimEnd();
		btags = _keep_original_ws(bline, btags).trimEnd();

		yield "- " + aline;
		if (atags) {
			yield `? ${atags}\n`;
		}

		yield "+ " + bline;
		if (btags) {
			yield `? ${btags}\n`;
		}
	}
}


function _keep_original_ws(s, tag_s) {
	// Replace whitespace with the original whitespace characters in `s`
	let result = '';
	for (let i = 0; i < s.length; i++) {
		const c = s.charAt(i);
		const tag_c = tag_s.charAt(i);
		if (tag_c === ' ' && /\s/.test(c)) {
			result += c;
		} else {
			result += tag_c;
		}
	}
	return result;
}


class Diff {
	constructor(a, b) {
		this.a = a;
		this.b = b;
		this.matcher = new SequenceMatcher(c => " \t".includes(c), a, b);
	}

	html(mutator) {
		if (typeof mutator !== 'function') mutator = (x, tag) => x;
		let out = "";
		for (let [tag, alo, ahi, blo, bhi] of this.matcher.get_opcodes()) {
			if (tag == 'replace')
				out += `<span class="replace">${mutator(this.b.slice(blo, bhi), tag)}</span>`;
			else if (tag == 'delete')
				out += `<span class="delete">${mutator(this.a.slice(alo, ahi), tag)}</span>`;
			else if (tag == 'insert')
				out += `<span class="insert">${mutator(this.b.slice(blo, bhi), tag)}</span>`;
			else if (tag == 'equal')
				out += `<span class="equal">${mutator(this.b.slice(blo, bhi), tag)}</span>`;
			else
				throw new Error(`unknown tag tag`);
		}
		//return `<span class="changed">${this.b}</span>`;
		return out;
	}

}


function ISLINEJUNK(line) {
    const pat = /^\s*(?:#\s*)?$/;
    return pat.test(line);
}

function ISCHARACTERJUNK(ch) {
    const ws = " \t";
    return ws.includes(ch);
}


function ndiff(a, b, linejunk, charjunk) {
	if (charjunk === undefined) charjunk = ISCHARACTERJUNK;
	return new Differ(linejunk, charjunk).compare(a, b);
}
