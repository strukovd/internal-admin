<template>
	<div class="file-picker-box" :class="{ invalid: error }">
		<header class="header" style="display:flex; align-items:start; padding-right:1em;">
			<div v-if="label" class="caption-container" style="flex:auto 1 1;">
				<span class="caption">{{ label }}</span>
			</div>

			<div v-if="error" class="error-container" style="display:flex; gap:.2em; justify-content:flex-end; font-size:14px; color:red; opacity:.6; line-height:1.4em;">
				<BaseIcon name="mdi-alert-decagram" size="1.2em" />
				<span class="error-message">{{ error }}</span>
			</div>
		</header>

		<div :class="[`file-picker`, { unstored: selectedFiles.length > 0 }]" @dragover.prevent @drop.prevent="onSelectFile">
			<div class="drop-zone">

				<!-- Пустая зона -->
				<section v-if="!selectedFiles.length" class="empty-section">
					<BaseIcon class="icon" :name="multiple ? 'mdi-file-document-multiple-outline' : 'mdi-file-document-plus-outline'"/>
				</section>

				<!-- Выбранные файлы -->
				<section v-else class="preview-section">
					<div class="file-list">
						<div style="font-size:1.2em; display:flex; align-items:center; gap:0.3em;" class="file-pill" v-for="(file, index) of selectedFiles" :key="file.name + '-' + file.lastModified">
							<BaseIcon name="mdi-paperclip" size="1.1em"/>
							<span class="file-name">{{ file.name }}</span>

							<!-- Кнопка удаления файла -->
							<BaseIcon name="mdi-close-circle" size="1.1em" style="cursor:pointer; opacity:0.6;" @click="removeFile(index)"/>
						</div>
					</div>
				</section>

				<section class="label-section">
					<span>Перетащите {{ multiple ? 'файлы' : 'файл' }} сюда или нажмите <br/> «Выбрать файл».</span>
				</section>

				<BaseButton class="button" prependIcon="mdi-plus" @click="openFileDialog" color="primary"><span>Выбрать файл</span></BaseButton>
			</div>

			<input
				type="file"
				:multiple="multiple"
				ref="fileInput"
				style="display:none;"
				@change="onSelectFile"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import BaseIcon from './BaseIcon.vue';
import BaseButton from './BaseButton.vue';

export default defineComponent({
	name: 'BaseFilePicker',
	components: { BaseButton, BaseIcon },
	emits: [ 'update:modelValue' ],
	props: {
		label: String,
		modelValue: { type: [Object, Array] as PropType<File | File[] | null>, default: null },
		error: String,
		multiple: Boolean,
	},

	data() {
		return {
			selectedFiles: [] as File[],
		};
	},

	watch: {
		modelValue: {
			immediate: true,
			handler(value) {
				if (this.multiple) {
					this.selectedFiles = Array.isArray(value) ? value : (value ? [value] : []);
				} else {
					this.selectedFiles = value ? [value as File] : [];
				}
			}
		}
	},

	methods: {
		openFileDialog() {
			(this.$refs.fileInput as HTMLInputElement).click();
		},

		onSelectFile(event: any) {
			const dt = event?.dataTransfer?.files;
			const input = event?.target?.files;
			const list = dt?.length ? dt : input;

			if (!list || !list.length) return;

			const files = Array.from(list);

			this.selectedFiles = this.multiple ? files : [files[0]];

			this.$emit(
				'update:modelValue',
				this.multiple ? [...this.selectedFiles] : this.selectedFiles[0]
			);

			// reset input (чтобы можно было выбрать тот же файл снова)
			if (event.target) {
				event.target.value = '';
			}
		},

		removeFile(index: number) {
			// Удаляем файл
			this.selectedFiles.splice(index, 1);

			// Emit нового значения
			if (this.multiple) {
				this.$emit('update:modelValue', [...this.selectedFiles]);
			} else {
				this.$emit('update:modelValue', null);
			}
		},

		getSelectedFiles() {
			return [...this.selectedFiles];
		},
	},
});
</script>

<style lang="scss">
.file-picker-box {
	.header {
		.caption-container {
			.caption {
				font-size:14px;
				opacity:.6;
				line-height: 1.4em;
				margin-bottom: .4em;
			}
		}
	}

	.file-picker {
		border:1px dashed #E0E2E791;
		border-radius:6px;
		user-select:none;
		padding:1.5em 0;
		margin:0 0 .6em 0;

		&.unstored {
			border-color: forestgreen;
			background: #90ee901a;
		}

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
				.file-list {
					display: flex;
					flex-direction: column;
					justify-content: center;
					align-items: center;
				}
				.preview {
					object-fit: contain;
					border-radius: 8px;
					max-width: 80%;
					max-height: 80%;
					border-radius: 8px;
				}
			}

			.label-section {
				opacity:.8;
				margin:.5em 1em;
				font-size:.9em;
			}

			.button {
				margin-top:1em;
				font-size:.9em;
			}
		}
	}

	&.invalid {
		.file-picker {
			border: 1px dashed #ff000055;
			// border: 1px dashed red;
			// outline:1px dashed red;

			// background-color: #f0f3f5;
			// border: 1px dashed #e4e7ea;
			// color: #5c6873;
		}
	}

}
</style>
