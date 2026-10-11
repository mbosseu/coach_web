/* Minimal OOXML workbook, string cells (never formulas), UTF-8 ZIP without dependencies. */
(function(root){
  'use strict';
  const xml=value=>String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const encode=text=>new TextEncoder().encode(text);
  function crc(bytes){let value=0xffffffff;for(const byte of bytes){value^=byte;for(let k=0;k<8;k++)value=(value>>>1)^((value&1)?0xedb88320:0)}return(value^0xffffffff)>>>0}
  function concat(arrays){const out=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let offset=0;for(const bytes of arrays){out.set(bytes,offset);offset+=bytes.length}return out}
  function zip(files){const local=[],central=[];let offset=0;
    for(const [filename,content]of files){const name=encode(filename),bytes=encode(content),checksum=crc(bytes),header=new Uint8Array(30+name.length),h=new DataView(header.buffer);
      h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,0x21,true);h.setUint32(14,checksum,true);h.setUint32(18,bytes.length,true);h.setUint32(22,bytes.length,true);h.setUint16(26,name.length,true);header.set(name,30);local.push(header,bytes);
      const index=new Uint8Array(46+name.length),c=new DataView(index.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,0x21,true);c.setUint32(16,checksum,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);index.set(name,46);central.push(index);offset+=header.length+bytes.length;
    }
    const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,central.reduce((n,b)=>n+b.length,0),true);e.setUint32(16,offset,true);return concat([...local,...central,end]);
  }
  function column(index){let name='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))name=String.fromCharCode(65+(n-1)%26)+name;return name}
  function xlsx(rows){
    if(!rows.length||rows.length>100000||rows.some(r=>r.length>100))throw Error('Export trop volumineux.');
    const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const sheet=`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${rows[0].map((_,i)=>`<col min="${i+1}" max="${i+1}" width="${[0,1,2,4,6].includes(i)?30:18}" customWidth="1"/>`).join('')}</cols><sheetData>${rows.map((row,index)=>`<row r="${index+1}">${row.map((value,i)=>typeof value==='number'&&Number.isFinite(value)?`<c r="${column(i)}${index+1}" s="${index?0:1}"><v>${value}</v></c>`:`<c r="${column(i)}${index+1}" s="${index?0:1}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData><autoFilter ref="A1:${column(rows[0].length-1)}${rows.length}"/></worksheet>`;
    return zip([
      ['[Content_Types].xml',`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
      ['_rels/.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ['xl/workbook.xml',`<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets><sheet name="Déclarations" sheetId="1" r:id="rId1"/></sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel}/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml',`<styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF101D35"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
      ['xl/worksheets/sheet1.xml',sheet]
    ]);
  }
  const api={xlsx};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BCExport=api;
})(typeof window==='undefined'?globalThis:window);
