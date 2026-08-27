export function ThemeInit() {
  const code = `(()=>{try{const s=localStorage.getItem("procesa-theme");const t=s==="dark"?"dark":"light";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}})()`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}