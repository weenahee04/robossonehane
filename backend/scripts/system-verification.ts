import { runSystemVerification } from '../test/helpers/system-verification.ts';

async function main() {
  const result = await runSystemVerification();

  console.log('ROBOSS system verification');
  console.log(`Result: ${result.ok ? 'PASS' : 'FAIL'}`);
  console.log(`Go/No-Go: ${result.goNoGo.toUpperCase()}`);

  console.log('\nCriteria:');
  result.criteria.forEach((criterion) => {
    console.log(`- [${criterion.passed ? 'x' : ' '}] ${criterion.name}`);
  });

  console.log('\nSteps:');
  result.steps.forEach((step) => {
    console.log(`- ${step.passed ? 'PASS' : 'FAIL'} ${step.name}: ${step.detail}`);
  });

  console.log('\nArtifacts:');
  console.log(JSON.stringify(result.artifacts, null, 2));

  if (result.blockers.length > 0) {
    console.log('\nProduction blockers:');
    result.blockers.forEach((blocker) => {
      console.log(`- ${blocker}`);
    });
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
