<template>
  <div id="menu-bar" class="menu-bar">
    <div class="menu-group" id="file-group">
      <button id="new-db-button" class="menu-button">
        <span class="material-symbols-outlined">database</span> New DB
      </button>
      <button id="open-db-button" class="menu-button">
        <span class="material-symbols-outlined">database_upload</span> Open
      </button>
      <button id="save-db-button" class="menu-button">
        <span class="material-symbols-outlined">save</span> Save
      </button>
    </div>
    <div class="menu-group" id="query-group">
      <button id="new-query-button" class="menu-button">
        <span class="material-symbols-outlined">post_add</span> New Query
      </button>
      <button id="open-query-button" class="menu-button">
        <span class="material-symbols-outlined">folder_open</span> Open Query
      </button>
      <button id="save-query-button" class="menu-button">
        <span class="material-symbols-outlined">save</span> Save Query
      </button>
      <button id="run-button" class="menu-button">
        <span class="material-symbols-outlined">play_arrow</span> Run
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
defineEmits<{ 'open-help': [] }>();
</script>
