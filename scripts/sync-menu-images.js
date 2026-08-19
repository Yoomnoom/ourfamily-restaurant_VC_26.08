// 음식사진/ 폴더에 메뉴 이름으로 사진(예: 참치김치찌개.png)을 넣고 이 스크립트를 실행하면,
// 자동으로 1000px/JPEG 압축 → Supabase Storage(menu-images 버킷) 업로드 →
// menu_default_images_vc2608에 등록까지 끝남. 그 뒤로는 3-0/3-1/5-2 화면에서
// API.menuImages.get(메뉴이름)이 이 사진을 바로 찾아서 보여줌.
//
// 사용법:
//   cd scripts
//   npm install        (최초 1회만)
//   node sync-menu-images.js
//
// 파일 이름 = 메뉴 이름 그대로(예: "참치김치찌개.png")여야 매칭됨.
// 이미 등록된 메뉴도 다시 실행하면 최신 파일로 덮어씀(사진을 바꿔 넣었을 때 유용).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pkucszwwnwpzvzqczmhh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdWNzend3bndwenZ6cWN6bWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NTA3NzAsImV4cCI6MjA5OTIyNjc3MH0.81Tv7-cTCr2CwUv8XYHc7FEUihtHzQYIPLSKjTzEoo0';
const PHOTOS_DIR = path.join(__dirname, '..', '음식사진');
const BUCKET = 'menu-images';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const files = fs.readdirSync(PHOTOS_DIR).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
  if (!files.length) {
    console.log('음식사진/ 폴더에 이미지가 없어요.');
    return;
  }
  console.log(`${files.length}개 파일 발견, 처리 시작...`);

  for (const file of files) {
    const menuName = file.replace(/\.(png|jpg|jpeg)$/i, '');
    const srcPath = path.join(PHOTOS_DIR, file);

    try {
      const resized = await sharp(srcPath)
        .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Storage 오브젝트 키는 ASCII만 허용 — 한글 파일명 대신 해시값 사용(menu_name엔 한글 그대로 저장).
      const objectKey = crypto.createHash('sha1').update(file).digest('hex').slice(0, 16) + '.jpg';

      const upload = await sb.storage.from(BUCKET).upload(objectKey, resized, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (upload.error) throw upload.error;

      const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(objectKey);

      const dbRes = await sb
        .from('menu_default_images_vc2608')
        .upsert({ menu_name: menuName, image_url: pub.publicUrl, source: 'manual' }, { onConflict: 'menu_name' });
      if (dbRes.error) throw dbRes.error;

      const sizeKB = Math.round(resized.length / 1024);
      console.log(`✔ ${menuName} — ${sizeKB}KB로 압축 후 등록 완료`);
    } catch (err) {
      console.log(`✘ ${menuName} 실패: ${err.message || err}`);
    }
  }
  console.log('완료.');
}

main();
