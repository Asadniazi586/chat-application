export default function Test() {
  console.log('Test component rendered');
  
  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Testing Tailwind</h1>
      
      <div className="bg-red-500 text-white p-4 rounded-lg" style={{ marginTop: '10px' }}>
        This should be RED with white text
      </div>
      
      <div className="bg-blue-500 text-white p-4 rounded-lg" style={{ marginTop: '10px' }}>
        This should be BLUE with white text
      </div>
      
      <div className="bg-green-500 text-white p-4 rounded-lg" style={{ marginTop: '10px' }}>
        This should be GREEN with white text
      </div>
      
      <div style={{ marginTop: '20px', color: '#666' }}>
        If you see colors above, Tailwind is working! ✅
        <br />
        If all boxes are white/gray, Tailwind is NOT loading ❌
      </div>
    </div>
  );
}