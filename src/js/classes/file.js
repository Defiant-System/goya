
class File {

	constructor(fsFile, data) {
		// save reference to original FS file
		this._file = fsFile || new defiant.File({ kind: "jpg" });

		// if new "empty" file
		if (!fsFile.blob) return;

		// temp offscreen canvas
		let { cvs, ctx } = Utilities.createCanvas(1, 1);

		switch (this._file.kind) {
			case "png":
			case "jpg":
			case "jpeg":
			case "gif":
				let src = URL.createObjectURL(fsFile.blob);
				this.loadImage(src)
					.then(img => {
						let width = img.width,
							height = img.height,
							dim = { width, height };

						cvs.attr(dim);
						// flip image vertically
						ctx.translate(0, height);
						ctx.scale(1, -1);
						ctx.drawImage(img, 0, 0);

						let wgl = STUDIO.wgl,
							Paint = STUDIO.painter,
							texture = wgl.buildTexture(wgl.RGBA, wgl.UNSIGNED_BYTE, 0, 0, null, wgl.CLAMP_TO_EDGE, wgl.CLAMP_TO_EDGE, wgl.NEAREST, wgl.NEAREST);

						wgl.texImage2D(wgl.TEXTURE_2D, texture, 0, wgl.RGBA, wgl.RGBA, wgl.UNSIGNED_BYTE, cvs[0]);

						// resize layers
						window.find(".file-layers").css(dim);

						// Paint.resize({ ...dim, simulatorResize: true });
						Paint.resize(dim);
						Paint.simulator.resize(width, height);
						Paint.simulator.applyPaintTexture(texture, dim);
						Paint.needsRedraw = true;
						Paint.update();

						goya.sidebar.layers.dispatch({ type: "update-thumbnail" });
					});
				break;
			case "goya": /* TODO */ break;
		}
	}

	loadImage(url) {
		return new Promise(resolve => {
			let img = new Image;
			img.src = url;
			img.onload = () => resolve(img);
		});
	}

	dispatch(event) {
		let APP = eniac,
			xSheet,
			xClone,
			name,
			str;
		switch (event.type) {
			case "render-sheet-names":
				break;
		}
	}

	async toBlob(mime, quality) {
		let bgColor = goya.sidebar.layers.dispatch({ type: "get-bg-color" });
		// return promise
		return new Promise(async (resolve, reject) => {
			// generate blob
			STUDIO.painter.toBlob(blob => {
				// return created blob
				resolve(blob);
			}, mime, quality, bgColor);
		});
	}

	get isDirty() {
		
	}

}
