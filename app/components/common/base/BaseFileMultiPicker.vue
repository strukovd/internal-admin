<template>
	<div class="file-multi-picker-box" :class="{ 'invalid': error }">
		<header class="header" style="display:flex; align-items:start; padding-right:1em;">
			<div v-if="label" class="caption-container" style="flex:auto 1 1;">
				<span class="caption">{{ label }}</span>
			</div>
			<div v-if="error" class="error-container" style="display:flex; gap:.2em; justify-content:flex-end; font-size:14px; color:red; opacity:.6; line-height:1.4em;">
				<v-icon icon="mdi-alert-decagram" size="1.2em"></v-icon>
				<span class="error-message">{{ error }}</span>
			</div>
		</header>

		<main :class="[`file-picker`]" @dragover.prevent @drop.prevent="onSelectFile">
			<div class="drop-zone">
				<section v-if="!selectedFiles?.length" class="empty-section">
					<v-icon class="icon" icon="mdi-image-multiple-outline"></v-icon>
				</section>
				<section v-else class="preview-section">
					<header class="preview-header">
						<div style="padding:.6em 1em; border-radius:6px; opacity:.7;">
							<span>Всего: <span style="font-weight:300;">{{ selectedFiles?.length }}</span></span>
						</div>
						<BaseTabs v-model="curDisplayMode" :items="[{ key: 'LIST', caption: 'Список', icon: 'mdi-format-list-bulleted' }, { key: 'ICONS', caption: 'Предпросмотр', icon: 'mdi-image-multiple-outline' }]"></BaseTabs>
					</header>

					<!-- Список -->
					<div v-if="curDisplayMode === 'LIST'" class="list-preview">
						<div v-for="(file, index) of selectedFiles" :key="index"
							:id="`i-${index}`"
							class="small-item-image"
							draggable="true"
							@dragenter="handleDragEnter"
							@dragover="handleDragOver"
							@drop="handleDrop"
							@dragleave="handleDragLeave"
							@dragstart="handleDragStart"
							@dragend="handleDragEnd"
						>
							<span class="file-name">{{ file.name ?? file.key }}</span>
							<div class="buttons">
								<v-icon class="icon-button" icon="mdi-eye" size="16" fill="#858D9D"/>
								<v-icon class="icon-button" icon="mdi-delete" size="16" fill="#858D9D"/>
							</div>
						</div>
					</div>

					<!-- Предпросмотр -->
					<div v-if="curDisplayMode === 'ICONS'" class="icons-preview">
						<div v-for="(file, index) of selectedFiles" :key="index"
							:id="`i-${index}`"
							class="small-preview-image"
							:class="{ 'unstored': file.constructor.name === 'File' }"
							draggable="true"
							@contextmenu.prevent="/*$popup.show({
								event:$event,
								items:
									tags.map(tag => {
										return {
											name: tag,
											icon: `mdi-tag`,
											fn: (item: any) => { file.tag = tag; selectedFiles = [...selectedFiles] }
										} as PopupItem;
									})
										.concat([
											{ name: 'Убрать тег', icon: 'mdi-tag-minus', fn: (item: any) => { delete file.tag; selectedFiles = [...selectedFiles]; } },
											{ name: 'Удалить', icon: 'mdi-delete', fn: deleteImage.bind(null, file) },
											{ name: 'Удалить все', icon: 'mdi-delete-alert', fn: deleteAll },
										] as PopupItem[])
							})*/"
							@dragenter="handleDragEnter"
							@dragover="handleDragOver"
							@drop="handleDrop"
							@dragleave="handleDragLeave"
							@dragstart="handleDragStart"
							@dragend="handleDragEnd"
							:style="{
								background: `url(${previewMap[String(file?.key ?? file.name)]})`,
								backgroundSize: 'cover',
								backgroundPosition: 'center'
							}"
						>
							<!-- <div class="buttons">
								<v-icon class="icon-button" icon="mdi-delete" size="16" fill="#858D9D"/>
							</div> -->

							<div class="tag" v-if="file.tag">{{ file.tag }}</div>
						</div>
					</div>
				</section>

				<section class="label-section">
					<span>Перетащите изображения сюда или нажмите <br> «Добавить изображения».</span>
				</section>
				<BaseButton class="button" prependIcon="mdi-plus" @click="onClick" color="primary"><span>Добавить изображения</span></BaseButton>
			</div>
			<input type="file" ref="fileInput" accept="image/*" multiple style="display:none;" @change="onSelectFile">
		</main>
	</div>
</template>

<script lang="ts">
export class FileRegistryModel {
	key: string = '';
	id?: number;
	extension?: string;
	mimetype?: string;
	name?: string;
	path?: string;
	size?: number;
	tag?: string;

	content?: any;


	constructor(partial: Partial<FileRegistryModel>) {
		Object.assign(this, partial);
	}
}

// import { PopupItem } from '@/plugins/popup';
import { defineComponent } from 'vue';


export default defineComponent({
	name: 'BaseFileMultiPicker',
	emits: [ 'update:modelValue', 'previewUpdated' ],
	props: {
		displayMode: { type: String as () => 'LIST' | 'ICONS', default: 'ICONS' },
		label: String,
		src: String as () => string|null,
		tags: { type: Array as () => string[], default: () => [] },
		modelValue: Array as () => FileRegistryModel[],
		error: String
	},

	watch: {
		modelValue(newValue, oldValue) {
			/* Примечание: наблюдатель не срабатывает на первый раз автоматически
			Он срабатывает только при изменении значения modelValue. */

			// Сохраняем внешне обновленное значение v-model
			// Это нужно дляизменения списка, при переключении вкладок
			this.selectedFiles = newValue;
		},

		selectedFiles(newValue, oldValue) {
			const preview = this.getPreview();

			this.$emit('update:modelValue', this.selectedFiles);
			this.$emit('previewUpdated', preview);
		}
	},

	data() {
		return {
			curDisplayMode: this.displayMode,
			selectedFiles: [] as any[], // (FileRegistryModel & File)[], // FileRegistryModel[] | File[],
			previewMap: {} as any,
			// Drag'n'Drop
			draggableItem: null as any,
		};
	},

	methods: {
		_extractSelectedFilesLite(): any {
			return this.selectedFiles.map(curFile => ({
				...curFile,
				content: undefined,
				name: curFile.name,
				_type: typeof curFile,
				_constructor: curFile.constructor.name
			}));
		},

		getPreview(): string | undefined {
			if( !this.selectedFiles.length ) return undefined;
			// Возвращает превь-файла с тегом "COVER" или частитчно содержит "COVER", или просто первый файл
			const coverFiles = this.selectedFiles.filter( (file) => String(file?.tag) === "COVER" );

			if( coverFiles.length < 1 ) { const f = this.selectedFiles.filter((file) => { return String(file?.tag).includes("COVER"); }); if(f.length) coverFiles.push(f[0]); }
			if( coverFiles.length < 1 ) coverFiles.push( this.selectedFiles[0] );

			const file = coverFiles[0];

			const preview = this.previewMap[String(file?.key ?? file.name)];
			return preview;
		},

		onClick() {
			(this.$refs.fileInput as HTMLInputElement).click();
		},

		onSelectFile(e: any) {
			let addedFiles: File[];
			if( e?.dataTransfer?.files ) addedFiles = Array.from(e?.dataTransfer?.files);
			else if( e?.target?.files ) addedFiles = Array.from(e.target.files);
			else return;

			// Предотвращаем странные срабатывания (при перетаскивании, и т.п.) которые вызывает input@change
			if( addedFiles.length === 0 ) { return; }

			// Загружаем содержимое файлов
			if( addedFiles ) {
				for (const file of addedFiles) {
					// Загружаем содержимое файла
					const reader = new FileReader();
					reader.onloadend = () => {
						this.previewMap[String(file.name)] = reader.result as string;
						this.selectedFiles = [...this.selectedFiles, file];
					};
					reader.readAsDataURL(file as any);
				}
			}
		},

		deleteImage(image: any) {
			this.selectedFiles = [...this.selectedFiles.filter(i => i !== image)];
		},

		deleteAll() {
			this.selectedFiles = [];
		},


		handleDragEnter(e: any) { // Подсетить схаченный элемент
			// if( e.target !== e.currentTarget ) {
			// 	return;
			// }
			e.currentTarget.classList.add("highlight");
		},

		handleDragLeave(e: any) { // Отустил, убрать подсветку элемента
			// if( e.target !== e.currentTarget ) {
			//   return;
			// }
			e.currentTarget.classList.remove("highlight");
		},

		handleDragOver(e: any) {
			// if( e.target !== e.currentTarget ) {
			// 	return;
			// }
			//Отмена дефолтных реакци на перетаскивание к дропу
			e.preventDefault();
		},

		handleDrop(e: any) { // Сброс элемента (обновление позиций элементов)
			const targetPlaceItem = e.currentTarget;

			if (this.draggableItem) {
				// Выясняем позиции перетаскиваемого и сдвигаемого элемента
				const targetItemIndex = parseInt( String(targetPlaceItem.id).replace('i-', '') );
				const draggableItemIndex = parseInt( String(this.draggableItem.id).replace('i-', '') );

				if (draggableItemIndex !== targetItemIndex) {
					// Меняем элементы местами,
					const draggableItem = this.selectedFiles[draggableItemIndex];
					this.selectedFiles.splice(draggableItemIndex, 1);
					this.selectedFiles.splice(targetItemIndex, 0, draggableItem);
					this.selectedFiles = [...this.selectedFiles];
				}
			}

			e.currentTarget.dispatchEvent(new Event("dragleave"));
		},

		handleDragStart(e: any) {
			// Сохраняем схваченный элемент
			if (e.target === e.currentTarget) {
				this.draggableItem = e.currentTarget;
			}
		},

		handleDragEnd(e: any) { // Сброс схваченного элемента
			this.draggableItem = null;
		},
	},

	created() {
		let	files: any[] = this.modelValue ?? [];
		// Сортируем по порядковому номеру
		files = files.sort((a, b) => a.seq - b.seq);
		// Инициализируем путь к превью для хранящихся файлов
		files.forEach((file: FileRegistryModel) => {
			if( !this.previewMap[String(file?.key ?? file.name)] && file?.path ) {
				this.previewMap[String(file?.key ?? file.name)] = `https://files.gazprom.kg/${file.path}`;
			}
		});

		// Явно обновляем ссылку, чтобы обновился фронт
		this.selectedFiles = files;
	},
});
</script>

<style lang="scss">
.file-multi-picker-box {
	position: relative;

	.header {
		.caption-container {
			.caption {
				font-size:14px;
				opacity:.6;
				line-height: 1.4em;
				margin-bottom: .4em;
			}
		}
		.error-container {
			.error-message {

			}
		}
	}

	.file-picker {
		border:1px dashed #E0E2E791;
		border-radius:6px;
		user-select:none;
		padding:0 0 1.5em 0;
		margin:0 0 .6em 0;

		.drop-zone {
			text-align:center;
			margin:.4em 0;

			.empty-section {
				.icon {
					font-size:5em;
					margin:.1em 0;
					opacity:.8;
					vertical-align:baseline;
				}
			}

			.preview-section {
				.preview-header {
					padding:0 1em;
					display:flex;
					align-items:center;
					// justify-content:right;
					border-bottom:1px solid #f0f0f0;

					:last-child {
						flex-grow: 1;
						text-align:right;
					}
				}

				.list-preview, .icons-preview {
					width: 100%;
					display: flex;
					flex-wrap: wrap;
				}

				.list-preview {
					gap: .4em .6em;
					padding:1em 1em;
					margin:auto;
					// justify-content: center;
					align-items: center;

					.small-item-image {
						line-height:1.4em;
						width: 250px;
						padding: 9px 5px 9px 15px;
						background: #f6f6f6;
						border-radius: 6px;
						cursor: pointer;
						display: flex;
						align-items: center;
						justify-content: space-between;
						transition: transform 1s ease 0s;

						.file-name {
							text-wrap:nowrap;
							overflow:hidden;
							text-overflow:ellipsis;
							font-size: .84em;
						}
						.buttons {
							display: flex;
							justify-content: center;
							align-items: center;
							gap:.1em;

							.icon-button {
								display:inline-flex;
								padding:.2em;
								opacity:.6;
								box-sizing: content-box;
								transition:all 300ms ease 0s;

								&:hover {
									background-color: #e5e5e5;
									border-radius: 3px;
								}
							}
						}

						&.highlight {
							transform: translateX(20px);
							position: relative;
							box-shadow: -20px 0 2px 0px #2b8aff71;
							outline: 3px dashed #2B8AFF;
						}
					}
				}

				.icons-preview {
					position:relative;
					padding:1em 1em;
					display: flex;
					flex-wrap: wrap;

					.unstored::before {
						content: "Новая";
						font-size: 10px;
						font-weight: 700;
						padding: .2em .6em;
						color: #1d691d;
						position: absolute;
						top: 0.3em;
						right: 0.4em;
						background: #53fd0f;
						border-radius: 2px;
						z-index: 1;
					}

					.small-preview-image {
						position: relative;
						margin:0 1em 1em 0;
						filter: brightness(.8);
						flex: 250px 1 0;
						height: 150px;
						border-radius: 8px;
						transition: transform 1s ease 0s;

						&:only-child {
							width: 100px;
							height: 350px;
						}

						.buttons {
							display: flex;
							justify-content:right;
							align-items: center;
							gap:.1em;

							.icon-button {
								display:inline-flex;
								padding:.2em;
								// opacity:.6;
								box-sizing: content-box;
								transition:all 300ms ease 0s;

								&:hover {
									background-color: #f0f0f0;
									border-radius: 3px;
								}
							}
						}

						.tag {
							position: absolute;
							bottom: 0;
							right: 0;
							left:0;
							background-color: #00000060;
							color: #fff;
							padding: 2px 6px;
							border-radius: 4px;
							font-size:.7em;
						}

						&.highlight {
							transform: translateX(20px);
							position: relative;
							box-shadow: -20px 0 2px 0px #2b8aff71;
							outline: 3px dashed #2B8AFF;
						}
					}
				}
				// .preview {
				// 	object-fit: contain;
				// 	border-radius: 8px;
				// 	max-width: 80%;
				// 	max-height: 80%;
				// 	border-radius: 8px;
				// }
			}

			.label-section {
				opacity:.8;
				margin:.5em 1em;
				font-size:.9em;
			}

			.button {
				margin-top:1em;
				font-size:.9em;
				display: inline-flex;
			}
		}
	}

	&.invalid {
		.file-picker {
			border: 1px dashed #ff000055;
			// outline:1px dashed red;

			// background-color: #f0f3f5;
			// border: 1px dashed #e4e7ea;
			// color: #5c6873;
		}
	}

}
</style>
