<template>
  <div id="sidebar" class="sidebar" @click.capture="closeDbObjectContextMenu">
    <!-- Databasesツリー -->
    <div class="tree-block databases-tree-block">
      <div class="tree-title" style="cursor:pointer" @click="onDbTreeTitleClick">
        <span class="material-symbols-outlined tree-toggle-icon">{{ dbTreeOpen ? 'expand_more' : 'chevron_right' }}</span>
        Databases
        <button id="refresh-db-button" class="menu-button" @click.stop="$emit('refresh-db')">
          <span class="material-symbols-outlined">refresh</span>
        </button>
      </div>
      <div id="db-tree" v-show="dbTreeOpen" class="tree-view"
        @dragover.prevent
        @drop.prevent="onDbTreeDrop"
      >
        <div v-for="schema in dbSchemas" :key="schema.alias" class="tree-item">
          <div
            class="tree-label db-node"
            :data-db-alias="schema.alias"
            style="cursor:pointer;display:flex;align-items:center;justify-content:space-between"
            @click="toggleDbNode(schema.alias, $event)"
          >
            <span style="display:flex;align-items:center;gap:4px">
              <span class="material-symbols-outlined toggle-icon">{{ dbNodeOpen[schema.alias] ? 'expand_more' : 'chevron_right' }}</span>
              <span class="material-symbols-outlined icon">database</span>
              {{ schema.alias }}
            </span>
            <button
              class="menu-button"
              :data-detach-alias="schema.alias"
              :title="schema.alias === 'main' ? 'メインDBをリセット' : `'${schema.alias}' をデタッチ`"
              style="font-size:14px"
              @click.stop="$emit('detach-db', schema.alias)"
            >
              <span class="material-symbols-outlined">link_off</span>
            </button>
          </div>
          <div class="db-children tree-items" :style="{ display: dbNodeOpen[schema.alias] ? '' : 'none' }">
            <template v-for="group in [
              { title: 'Tables', items: schema.tables || [], icon: 'table_chart' },
              { title: 'Views', items: schema.views || [], icon: 'visibility' },
              { title: 'Indexes', items: schema.indexes || [], icon: 'list' },
              { title: 'Triggers', items: schema.triggers || [], icon: 'bolt' },
            ]" :key="group.title">
              <div class="tree-group">
                <div
                  class="tree-label"
                  :class="`${group.title}-root`"
                  style="cursor:pointer"
                  @click="toggleGroupNode(schema.alias, group.title)"
                >
                  <span class="material-symbols-outlined toggle-icon">
                    {{ groupNodeOpen[`${schema.alias}__${group.title}`] ? 'expand_more' : 'chevron_right' }}
                  </span>
                  <span class="material-symbols-outlined icon">{{ group.icon }}</span>
                  {{ group.title }}
                </div>
                <div class="tree-items" :style="{ display: groupNodeOpen[`${schema.alias}__${group.title}`] ? '' : 'none' }">
                  <div v-for="name in group.items" :key="name" class="tree-item">
                    <div
                      class="tree-label"
                      :class="group.title"
                      :data-name="name"
                      :data-db-alias="schema.alias"
                      @contextmenu.prevent="onDbObjectContextMenu($event, schema.alias, group.title, name)"
                      @click="onTableClick(name, schema.alias)"
                    >
                      <span class="material-symbols-outlined icon">{{ group.icon }}</span>
                      {{ name }}
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- データセットツリー -->
    <div class="tree-block dataset-tree-block">
      <div class="tree-title" style="cursor:pointer" @click="onDatasetTreeTitleClick">
        <span class="material-symbols-outlined">{{ datasetTreeOpen ? 'expand_more' : 'chevron_right' }}</span>
        データセット
        <button id="add-dataset-button" class="menu-button" title="データセット追加" @click.stop="$emit('add-dataset')">
          <span class="material-symbols-outlined">upload_file</span>
        </button>
      </div>
      <div id="dataset-tree" v-show="datasetTreeOpen" class="tree-view">
        <div v-if="!datasetTables.length" class="tree-empty">データセットはありません</div>
        <div v-for="name in datasetTables" :key="name" class="tree-item">
          <div class="tree-label dataset-node" style="display:flex;align-items:center;justify-content:space-between">
            <span
              class="tree-label dataset"
              :data-name="name"
              :data-dataset-table-name="name"
              style="display:flex;align-items:center;gap:4px"
              @click="onDatasetClick(name)"
            >
              <span class="material-symbols-outlined icon">dataset</span>
              {{ name }}
            </span>
            <button
              class="menu-button"
              :data-delete-dataset-table="name"
              :title="`データセット '${name}' を削除`"
              style="font-size:14px"
              @click.stop="$emit('delete-dataset', name)"
            >
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="dbObjectContextMenu.visible"
      id="db-object-context-menu"
      class="context-menu"
      :style="{ left: `${dbObjectContextMenu.x}px`, top: `${dbObjectContextMenu.y}px` }"
    >
      <button
        id="db-object-show-ddl-menu"
        class="context-menu-item"
        @click.stop="onShowDdlMenuClick"
      >
        DDLを表示
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import { buildSelectAllQuery, DATASET_DB_ALIAS } from '../datasetDb';

defineOptions({ name: 'AppSidebar' });

const emit = defineEmits<{
  'refresh-db': [];
  'detach-db': [alias: string];
  'add-dataset': [];
  'delete-dataset': [name: string];
  'drop-files': [files: File[]];
  'set-query': [query: string];
  'show-ddl': [payload: { alias: string; name: string; objectType: DbObjectType }];
}>();

type DbObjectType = 'table' | 'view' | 'index' | 'trigger';

// ---- Databases ツリー ----
const dbTreeOpen = ref(true);
const dbSchemas = ref<Array<{
  alias: string;
  tables?: string[];
  views?: string[];
  indexes?: string[];
  triggers?: string[];
}>>([]);
const dbNodeOpen = reactive<Record<string, boolean>>({});
const groupNodeOpen = reactive<Record<string, boolean>>({});
const dbObjectContextMenu = reactive<{
  visible: boolean;
  x: number;
  y: number;
  alias: string;
  name: string;
  objectType: DbObjectType;
}>({
  visible: false,
  x: 0,
  y: 0,
  alias: '',
  name: '',
  objectType: 'table'
});

const groupTitleToObjectType: Record<string, DbObjectType> = {
  Tables: 'table',
  Views: 'view',
  Indexes: 'index',
  Triggers: 'trigger'
};

/**
 * 処理名: DBツリー開閉トグル
 * 処理概要: Databases ツリーパネルの表示・非表示を切り替える
 * 実装理由: パネルタイトルのクリックイベントに対応するため
 */
const onDbTreeTitleClick = () => { dbTreeOpen.value = !dbTreeOpen.value; };

/**
 * 処理名: DBツリードロップハンドラ
 * 処理概要: .db ファイルがドロップされた際に親コンポーネントにファイル一覧を渡す
 * 実装理由: DBツリーへのドラッグアンドドロップで複数DBを開くため
 * @param e ドラッグイベント
 */
const onDbTreeDrop = (e: DragEvent) => {
  const dropped = Array.from(e.dataTransfer?.files ?? []).filter(f => /\.db$/i.test(f.name));
  if (dropped.length) emit('drop-files', dropped);
};

/**
 * 処理名: DBノード開閉トグル
 * 処理概要: 指定エイリアスの DB ノードの展開・折りたたみを切り替える
 * 実装理由: ダブルクリックやメニューボタン操作と区別するため button クリックを除外する
 * @param alias DB エイリアス
 * @param e マウスイベント
 */
const toggleDbNode = (alias: string, e: MouseEvent) => {
  if ((e.target as HTMLElement).closest('button.menu-button')) return;
  dbNodeOpen[alias] = !dbNodeOpen[alias];
};

/**
 * 処理名: グループノード開閉トグル
 * 処理概要: 指定 DB エイリアス・グループ名のツリーグループ展開状態を切り替える
 * 実装理由: Tables / Views / Indexes / Triggers 各グループを個別に開閉するため
 * @param alias DB エイリアス
 * @param title グループタイトル
 */
const toggleGroupNode = (alias: string, title: string) => {
  const key = `${alias}__${title}`;
  groupNodeOpen[key] = !groupNodeOpen[key];
};

/**
 * 処理名: DBオブジェクト右クリックメニュー表示
 * 処理概要: Tables / Views / Indexes / Triggers の項目右クリックでメニューを開く
 * 実装理由: DDL表示アクションをコンテキストメニュー経由で提供するため
 * @param e マウスイベント
 * @param alias DBエイリアス
 * @param groupTitle グループ名
 * @param name DBオブジェクト名
 */
const onDbObjectContextMenu = (e: MouseEvent, alias: string, groupTitle: string, name: string) => {
  const objectType = groupTitleToObjectType[groupTitle];
  if (!objectType) return;
  dbObjectContextMenu.visible = true;
  dbObjectContextMenu.x = e.clientX;
  dbObjectContextMenu.y = e.clientY;
  dbObjectContextMenu.alias = alias;
  dbObjectContextMenu.name = name;
  dbObjectContextMenu.objectType = objectType;
};

/**
 * 処理名: DBオブジェクト右クリックメニュー閉じる
 * 処理概要: 表示中のコンテキストメニューを閉じる
 * 実装理由: メニュー外クリックや ESC 操作でメニューを閉じるため
 */
const closeDbObjectContextMenu = () => {
  dbObjectContextMenu.visible = false;
};

/**
 * 処理名: DDL表示メニュー選択
 * 処理概要: コンテキストメニューの DDL 表示を選択した際に親へ通知する
 * 実装理由: DDL 取得と表示を親コンポーネントに委譲するため
 */
const onShowDdlMenuClick = () => {
  emit('show-ddl', {
    alias: dbObjectContextMenu.alias,
    name: dbObjectContextMenu.name,
    objectType: dbObjectContextMenu.objectType
  });
  closeDbObjectContextMenu();
};

/**
 * 処理名: キー押下ハンドラ
 * 処理概要: Escape 押下時にコンテキストメニューを閉じる
 * 実装理由: キーボード操作でもメニューを閉じられるようにするため
 * @param e キーボードイベント
 */
const onWindowKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeDbObjectContextMenu();
  }
};

// ---- データセットツリー ----
const datasetTreeOpen = ref(true);
const datasetTables = ref<string[]>([]);

/**
 * 処理名: データセットツリー開閉トグル
 * 処理概要: データセットツリーパネルの表示・非表示を切り替える
 * 実装理由: パネルタイトルのクリックイベントに対応するため
 */
const onDatasetTreeTitleClick = () => { datasetTreeOpen.value = !datasetTreeOpen.value; };

/**
 * 処理名: テーブルクリックハンドラ
 * 処理概要: テーブルノードクリック時に SELECT * SQL を生成し親に渡す
 * 実装理由: テーブル選択でクエリエディタに SQL を挙入するため
 * @param name テーブル名
 * @param alias DB エイリアス
 */
const onTableClick = (name: string, alias: string) => {
  emit('set-query', buildSelectAllQuery(alias, name));
};

/**
 * 処理名: データセットクリックハンドラ
 * 処理概要: データセットノードクリック時に dataset スキーマの SELECT SQL を生成する
 * 実装理由: データセット選択時の SQL 生成を通常テーブルと共通化するため
 * @param name データセットテーブル名
 */
const onDatasetClick = (name: string) => {
  emit('set-query', buildSelectAllQuery(DATASET_DB_ALIAS, name));
};

// ---- 外部から呼び出す API ----
/**
 * 処理名: DBツリー更新
 * 処理概要: サイドバーに表示する DB スキーマ一覧を外部から更新する
 * 実装理由: 親コンポーネントが DB 変更時にツリーを再描画するため
 * @param schemas 更新する DB スキーマ配列
 */
const updateDatabaseTree = (schemas: typeof dbSchemas.value) => {
  dbSchemas.value = schemas ?? [];
};

/**
 * 処理名: データセットツリー更新
 * 処理概要: サイドバーに表示するデータセットテーブル名一覧を外部から更新する
 * 実装理由: CSV登録・削除後にデータセット一覧を再描画するため
 * @param tables 更新するテーブル名配列
 */
const updateDatasetTree = (tables: string[]) => {
  datasetTables.value = tables ?? [];
};

onMounted(() => {
  window.addEventListener('keydown', onWindowKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown);
});

defineExpose({ updateDatabaseTree, updateDatasetTree });
</script>
