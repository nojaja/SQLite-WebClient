<template>
  <div id="menu-bar" class="menu-bar">
    <div class="menu-group" id="file-group">
      <button id="new-db-button" class="menu-button" @click="$emit('new-db')">
        <span class="material-symbols-outlined">database</span> New DB
      </button>
      <button id="open-db-button" class="menu-button" @click="$emit('open-db')">
        <span class="material-symbols-outlined">database_upload</span> Open
      </button>
      <button id="save-db-button" class="menu-button" @click="$emit('save-db')">
        <span class="material-symbols-outlined">save</span> Save
      </button>
    </div>
    <div class="menu-group" id="query-group">
      <button id="new-query-button" class="menu-button" @click="$emit('new-query')">
        <span class="material-symbols-outlined">post_add</span> New Query
      </button>
      <button id="open-query-button" class="menu-button" @click="$emit('open-query')">
        <span class="material-symbols-outlined">folder_open</span> Open Query
      </button>
      <button id="save-query-button" class="menu-button" @click="$emit('save-query')">
        <span class="material-symbols-outlined">save</span> Save Query
      </button>
      <button id="run-button" class="menu-button" @click="$emit('run-query')">
        <span class="material-symbols-outlined">play_arrow</span> Run
      </button>
      <button id="show-plan-button" class="menu-button" @click="$emit('show-query-plan')">
        <span class="material-symbols-outlined">account_tree</span> Query Plan
      </button>
      <button id="format-query-button" class="menu-button" @click="$emit('format-query')">
        <span class="material-symbols-outlined">format_list_bulleted</span> Format
      </button>
    </div>
    <div class="menu-group" id="help-group">
      <button id="help-button" class="menu-button" @click="$emit('open-help')">
        <span class="material-symbols-outlined">help</span> Help
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'new-db': [];
  'open-db': [];
  'save-db': [];
  'new-query': [];
  'open-query': [];
  'save-query': [];
  'run-query': [];
  'show-query-plan': [];
  'format-query': [];
  'open-help': [];
}>();
</script>