const sleep = async function(time) {
	return new Promise(resolve => setTimeout(resolve, time));
};

const insertContainer = function() {
	let container = document.createElement('div');
	container.id = 'speed-read-container';
	const repeatIcon = 'svg'
	container.innerHTML = `
		<div class="speed-read-nav">
			<div class="speed-read-button-group speed-read-float-left">
				<span id="speed-read-restart-button">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-skip-back"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
				</span>
				<span id="speed-read-back-5s">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-rewind"><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon></svg>
				</span>
			</div>
			<div class="speed-read-button-group speed-read-float-right">
				<span id="speed-read-close-button">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
				</span>
			</div>
			<div class="speed-read-clearfix"></div>
			<div class="speed-read-range">
				<input type="range" min=0 max=1 id="speed-read-range" />
			</div>
		</div>
		<p id="speed-read-center-text"></p>
	`;
	document.body.appendChild(container);
};

class SpeedRead {
	constructor(article, navRange, settings) {
		this.article = article;
		this.cancelled = false;
		this.delays = {
			WORD: 60000 / settings.wpm,
			PARAGRAPH_END: settings.paragraph_end,
		}
		this.navRange = navRange;
		this.type = {
			WORD: 0,
			PARAGRAPH_END: 1,
			ARTICLE_END: 2,
		}

		this.buildIndexes();
		this.counter = 0;
		this.totalIndex = this.indexes.length;
		navRange.setAttribute('max', this.totalIndex);
		navRange.addEventListener('change', function(e) {
			this.counter = parseInt(e.target.value);
		}.bind(this));
	}

	isCancelled() {
		return this.cancelled;
	}

	cancel() {
		this.cancelled = true;
	}

	increment() {
		if (this.totalIndex - this.counter > 1) {
			this.counter += 1;
			this.navRange.value = this.counter;
		}
	}

	restart() {
		this.counter = 0;
	}

	rewind(time = 5000) {
		while (time > 0) {
			time = time - this.indexes[this.counter][2];
			this.counter -= 1;
		}
	}

	buildIndexes() {
		const delays = this.delays;
		const type = this.type;
	    let indexes = this.article.filter(tag => tag.nodeName == 'P');
	    indexes = indexes.reduce(function(list, paragraph) {
	    	const tokens = paragraph.innerText.split(' ');
	    	const indexes = tokens.reduce(function(carry, word) {
	    		return [...carry, [word, type.WORD, delays.WORD]]
	    	}, []);
	    	return [...list, ...indexes, ['', type.PARAGRAPH_END, delays.PARAGRAPH_END]];
	    }, []);
	    this.indexes = [...indexes, ['', type.ARTICLE_END, 1000]];
	}
}

const openContainer = async function(settings) {
    let articleContent = readability.grabArticle();
    articleContent = [...articleContent.childNodes[0].childNodes];
    articleContent = articleContent.filter(tag => tag.nodeName == 'P');

    const container = document.getElementById('speed-read-container');
    container.classList.add('active');
    window.scrollTo(0, 0);
    const closeButton = document.getElementById('speed-read-close-button');
    const restartButton = document.getElementById('speed-read-restart-button');
    const rewindButton = document.getElementById('speed-read-back-5s');
    const range = document.getElementById('speed-read-range');

    const speedRead = new SpeedRead(articleContent, range, settings);

    closeButton.addEventListener('click', function() {
    	speedRead.cancel();
    	container.classList.remove('active');
    });
    restartButton.addEventListener('click', () => speedRead.restart());
    rewindButton.addEventListener('click', () => speedRead.rewind());
    run(speedRead);
};

const run = async function(speedRead) {
    const centerText = document.getElementById('speed-read-center-text');

    while (!speedRead.isCancelled()) {
    	const [val, type, delay] = speedRead.indexes[speedRead.counter];
    	switch (type) {
    		case speedRead.type.WORD:
    			centerText.textContent = val;
    			await sleep(delay);
    			break;
    		case speedRead.type.PARAGRAPH_END:
    		case speedRead.type.ARTICLE_END:
    			await sleep(delay);
    			break;
    	}
    	speedRead.increment();
    }
};

insertContainer();
browser.runtime.onMessage.addListener(function(settings) {
	openContainer(settings);
})