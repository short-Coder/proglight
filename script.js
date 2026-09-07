// script.js (ローカルストレージ保存機能付き 完全版)

const cards = document.querySelectorAll(".course-card");

cards.forEach((card) => {
  // 1. スクロールフェードイン（元のまま）
  const index = card.style.getPropertyValue("--index") || 0;
  card.style.transitionDelay = `${index * 120}ms`;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        card.classList.add("is-visible");
        observer.unobserve(card);
      }
    },
    { threshold: 0.2 } 
  );
  observer.observe(card);


  // 2. マウス移動時の 3D傾き ＆ スポットライト位置計算（元のまま）
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateY = ((x - rect.width / 2) / rect.width) * 8;
    const rotateX = ((rect.height / 2 - y) / rect.height) * 8;

    card.style.setProperty("--mx", `${x}px`);
    card.style.setProperty("--my", `${y}px`);
    card.style.setProperty("--rx", `${rotateX}deg`);
    card.style.setProperty("--ry", `${rotateY}deg`);
  });


  // 3. マウスが外れたら傾きをリセット（元のまま）
  card.addEventListener("mouseleave", () => {
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  });


  // 4. 💡「始める」ボタンが押されたときの処理
  const btn = card.querySelector(".action-btn");
  if (btn) {
    btn.addEventListener("click", (e) => {
      // 3D傾きアニメーションやPlaycodeのリセット機能との不要な干渉を防ぐ
      e.stopPropagation(); 
      
      // HTMLに仕込んだ data-course の値（"typescript" など）を読み取る
      const courseId = btn.getAttribute("data-course");
      
      if (courseId) {
        // 💡 ブラウザのローカルストレージ（共通のメモ帳）に「selectedCourse」という名前で保存
        localStorage.setItem("selectedCourse", courseId);
      }
      
      // 登録完了後、安全に次の問題画面ページへ遷移する
      window.location.href = "course.html";
    });
  }

});
