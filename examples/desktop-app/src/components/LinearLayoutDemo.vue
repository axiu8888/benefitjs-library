<template>
  <div class="container">
    <h1>Vue LinearLayout 示例</h1>
    
    <!-- 
    <LinearLayout orientation="horizontal" height="100px">
      <LayoutItem weight="1" style="background: lightblue">1</LayoutItem>
      <LayoutItem weight="2" style="background: lightgreen">2</LayoutItem>
      <LayoutItem weight="3" style="background: red">2</LayoutItem>
    </LinearLayout> 
    -->

    <LinearLayout orientation="vertical" gap="10" class="example-layout">
      <LayoutItem class="header" weight="0">
        <h2>标题栏</h2>
      </LayoutItem>

      <LinearLayout minHeight="800px" orientation="horizontal" weight="2" gap="5">
        <LayoutItem class="sidebar" weight="1"> 侧边栏 (weight=1) </LayoutItem>

        <LinearLayout orientation="vertical" weight="1" gap="5">
          <LayoutItem class="content" weight="1">
            内容区域 1 (weight=1)
          </LayoutItem>
          <LayoutItem class="content" weight="2">
            内容区域 2 (weight=2)
          </LayoutItem>
          <LayoutItem class="content" weight="1">
            内容区域 3 (weight=1)
          </LayoutItem>
        </LinearLayout>
      </LinearLayout>

      <LayoutItem class="footer" weight="0"> 页脚 </LayoutItem>
    </LinearLayout>
  </div>
</template>

<script setup>
import LinearLayout from "../widgets/LinearLayout.vue";
import LayoutItem from "../widgets/LayoutItem.vue";
</script>

<style scoped>
.container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.example-layout {
  border: 1px solid #ccc;
  height: 500px;
}

.header,
.footer {
  background-color: #f0f0f0;
  padding: 10px;
  text-align: center;
}

.sidebar {
  background-color: #e1f5fe;
  padding: 10px;
}

.content {
  background-color: #e8f5e9;
  padding: 10px;
  border: 1px solid #c8e6c9;
}
</style>
