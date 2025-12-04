// Firebase SDK import (모듈 버전)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// Firebase 설정 정보 (사용자가 제공한 설정)
const firebaseConfig = {
  apiKey: "AIzaSyANXCgwJ6ttxc8mAMK2W0hfOLwiczs98KY",
  authDomain: "ihjin-todo-backend.firebaseapp.com",
  projectId: "ihjin-todo-backend",
  storageBucket: "ihjin-todo-backend.firebasestorage.app",
  messagingSenderId: "337507938786",
  appId: "1:337507938786:web:9c4970f7b476e0f43fc9bb",
  databaseURL: "https://ihjin-todo-backend-default-rtdb.firebaseio.com/",
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const todosRef = ref(db, "todos");

// DOM 요소
const todoInput = document.getElementById("todoInput");
const categorySelect = document.getElementById("categorySelect");
const addBtn = document.getElementById("addBtn");
const todoListEl = document.getElementById("todoList");
const emptyTextEl = document.getElementById("emptyText");
const leftCountEl = document.getElementById("leftCount");
const totalCountTextEl = document.getElementById("totalCountText");
const todayEl = document.getElementById("today");

// 카테고리(중요도) 정의
const CATEGORY_META = {
  very_important: { label: "매우 중요", order: 1, className: "cat-very_important" },
  important: { label: "중요", order: 2, className: "cat-important" },
  normal: { label: "보통", order: 3, className: "cat-normal" },
  less_important: { label: "덜 중요", order: 4, className: "cat-less_important" },
};

// 메모리 상의 할 일 목록 (Firebase와 동기화용)
let todos = [];

// 오늘 날짜 표시
const today = new Date();
const formatted =
  today.getFullYear() +
  ". " +
  String(today.getMonth() + 1).padStart(2, "0") +
  ". " +
  String(today.getDate()).padStart(2, "0");
todayEl.textContent = formatted;

// UI 렌더링
function render() {
  todoListEl.innerHTML = "";

  if (todos.length === 0) {
    emptyTextEl.style.display = "block";
  } else {
    emptyTextEl.style.display = "none";
  }

  // 카테고리별 그룹화 + 중요도 순으로 정렬
  const grouped = {};
  Object.keys(CATEGORY_META).forEach((key) => {
    grouped[key] = [];
  });

  todos.forEach((todo) => {
    const cat = todo.category && CATEGORY_META[todo.category] ? todo.category : "normal";
    grouped[cat].push(todo);
  });

  const sortedCategoryKeys = Object.keys(CATEGORY_META).sort(
    (a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order
  );

  sortedCategoryKeys.forEach((catKey) => {
    const list = grouped[catKey];
    if (list.length === 0) return;

    // 섹션 헤더
    const header = document.createElement("div");
    header.className = "todo-item-header";
    const catMeta = CATEGORY_META[catKey];
    header.innerHTML = `<span>${catMeta.label}</span><span>${list.length}개</span>`;
    todoListEl.appendChild(header);

    // 카테고리 내에서는 생성 시간 기준 정렬 (가장 최근이 아래로)
    list
      .slice()
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .forEach((todo) => {
        const li = document.createElement("li");
        li.className = "todo-item";
        if (todo.completed) {
          li.classList.add("completed");
        }
        li.dataset.id = todo.id;

        // 왼쪽: 카테고리 동그라미 + 텍스트 + 아이콘 버튼
        const mainDiv = document.createElement("div");
        mainDiv.className = "todo-main";

        const catDot = document.createElement("span");
        catDot.className = `todo-category-dot ${catMeta.className}`;

        const span = document.createElement("span");
        span.className = "todo-text";
        span.textContent = todo.text;

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "todo-actions";

        const editBtn = document.createElement("button");
        editBtn.innerText = "✎";
        editBtn.className = "btn-edit";
        editBtn.title = "수정";
        editBtn.addEventListener("click", () => editTodo(todo.id));

        const deleteBtn = document.createElement("button");
        deleteBtn.innerText = "×";
        deleteBtn.className = "btn-delete";
        deleteBtn.title = "삭제";
        deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        mainDiv.appendChild(catDot);
        mainDiv.appendChild(span);
        mainDiv.appendChild(actionsDiv);

        // 오른쪽: 체크박스
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "todo-checkbox";
        checkbox.checked = todo.completed;
        checkbox.addEventListener("change", () => toggleCompleted(todo.id));

        li.appendChild(mainDiv);
        li.appendChild(checkbox);

        todoListEl.appendChild(li);
      });
  });

  updateCounter();
}

// 개수 갱신
function updateCounter() {
  const leftCount = todos.filter((t) => !t.completed).length;
  const totalCount = todos.length;

  leftCountEl.textContent = leftCount;
  totalCountTextEl.textContent = "총 " + totalCount + "개";
}

// Firebase 실시간 데이터 구독 (READ)
onValue(todosRef, (snapshot) => {
  const data = snapshot.val();
  const list = [];

  if (data) {
    Object.entries(data).forEach(([id, value]) => {
      list.push({
        id,
        text: value.text ?? "",
        completed: !!value.completed,
        createdAt: value.createdAt ?? 0,
        category: value.category || "normal",
      });
    });
  }

  todos = list;
  render();
});

// 할 일 추가 (CREATE)
function addTodo() {
  const text = todoInput.value.trim();
  const category = categorySelect.value || "normal";

  if (!text) {
    alert("할 일을 입력해 주세요.");
    todoInput.focus();
    return;
  }

  const newRef = push(todosRef);
  set(newRef, {
    text,
    completed: false,
    createdAt: Date.now(),
    category,
  }).catch((err) => {
    console.error("할 일 추가 실패:", err);
    alert("할 일을 추가하는 중 오류가 발생했습니다.");
  });

  todoInput.value = "";
  categorySelect.value = "normal";
  todoInput.focus();
}

// 완료 상태 토글 (UPDATE: completed)
function toggleCompleted(id) {
  const target = todos.find((t) => t.id === id);
  if (!target) return;

  const todoRef = ref(db, `todos/${id}`);
  update(todoRef, { completed: !target.completed }).catch((err) => {
    console.error("완료 상태 변경 실패:", err);
    alert("완료 상태를 변경하는 중 오류가 발생했습니다.");
  });
}

// 할 일 수정 (UPDATE: text)
function editTodo(id) {
  const target = todos.find((t) => t.id === id);
  if (!target) return;

  const newText = window.prompt("할 일을 수정하세요.", target.text);
  if (newText === null) {
    // 취소
    return;
  }
  const trimmed = newText.trim();
  if (!trimmed) {
    alert("내용이 비어 있습니다. 수정이 취소됩니다.");
    return;
  }

  const todoRef = ref(db, `todos/${id}`);
  update(todoRef, { text: trimmed }).catch((err) => {
    console.error("할 일 수정 실패:", err);
    alert("할 일을 수정하는 중 오류가 발생했습니다.");
  });
}

// 할 일 삭제 (DELETE)
function deleteTodo(id) {
  if (!window.confirm("정말로 삭제하시겠습니까?")) return;

  const todoRef = ref(db, `todos/${id}`);
  remove(todoRef).catch((err) => {
    console.error("삭제 실패:", err);
    alert("할 일을 삭제하는 중 오류가 발생했습니다.");
  });
}

// 이벤트 바인딩
addBtn.addEventListener("click", addTodo);
todoInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addTodo();
  }
});

// 초기 렌더
render();


